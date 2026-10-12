// 跨平台文件选择与上传工具（符合 image-upload skill 规范）
// weapp: 通过 Taro.chooseMedia 选择，tempFilePath 直接传给 supabase-wechat-js 上传
// H5: 通过 input[type=file] 选择，直接上传 File 对象

import Taro from '@tarojs/taro'
import {supabase} from '@/client/supabase'

export interface MiniProgramFileInput {
  tempFilePath: string
  size?: number
  type?: string
}

export interface UploadOptions {
  bucket: string
  userId: string
}

export interface UploadResult {
  success: boolean
  data?: {path: string}
  error?: string
}

/** 选择图片/视频（跨平台） */
export async function selectMediaFiles(options: {
  mediaType?: Array<'image' | 'video'>
  count?: number
}): Promise<Array<MiniProgramFileInput | File>> {
  const mediaType = options.mediaType || ['image']
  const count = options.count || 9
  if (process.env.TARO_ENV === 'h5') {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = mediaType.includes('video') ? 'image/*,video/*' : 'image/*'
      input.multiple = count > 1
      input.onchange = () => {
        const files = Array.from(input.files || [])
        resolve(files)
      }
      input.onerror = () => reject(new Error('选择文件失败'))
      input.click()
    })
  }
  const res = await Taro.chooseMedia({count, mediaType, sourceType: ['album', 'camera']})
  return res.tempFiles.map((f) => ({tempFilePath: f.tempFilePath, size: f.size, type: f.fileType}))
}

/** 上传到 Supabase Storage（跨平台） */
export async function uploadToSupabase(file: MiniProgramFileInput | File, opts: UploadOptions): Promise<UploadResult> {
  const timestamp = Date.now()
  const rand = Math.random().toString(36).substring(2, 10)
  const ext = 'webp'
  const path = `${opts.userId}/${timestamp}_${rand}.${ext}`

  try {
    const isWeapp = process.env.TARO_ENV !== 'h5'
    const filePath = isWeapp ? (file as MiniProgramFileInput).tempFilePath : ''
    const fileObj = !isWeapp ? (file as File) : undefined

    const {data, error} = await supabase.storage.from(opts.bucket).upload(path, isWeapp ? filePath : fileObj!, {
      contentType: 'image/webp',
      upsert: false
    })

    if (error) {
      console.error('上传失败:', error)
      return {success: false, error: error.message}
    }
    return {success: true, data: {path: data.path}}
  } catch (e) {
    const msg = e instanceof Error ? e.message : '上传失败'
    console.error('上传异常:', e)
    return {success: false, error: msg}
  }
}
