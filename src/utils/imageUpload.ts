import Taro from '@tarojs/taro'
import {supabase} from '@/client/supabase'

/**
 * 上传评论图片到Supabase Storage
 * @param filePath 本地文件路径
 * @param userId 用户ID
 * @returns 上传后的公开URL
 */
export async function uploadCommentImage(filePath: string, userId: string): Promise<string> {
  try {
    // 生成唯一文件名
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 15)
    const fileName = `${userId}/${timestamp}_${randomStr}.jpg`

    // 读取文件
    const fileSystemManager = Taro.getFileSystemManager()
    const fileData = fileSystemManager.readFileSync(filePath, 'base64')

    // 将base64转换为Blob
    const base64Data = fileData as string
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], {type: 'image/jpeg'})

    // 上传到Supabase Storage
    const {data, error} = await supabase.storage.from('comment-images').upload(fileName, blob, {
      contentType: 'image/jpeg',
      upsert: false
    })

    if (error) {
      console.error('上传图片失败:', error)
      throw error
    }

    // 获取公开URL
    const {data: urlData} = supabase.storage.from('comment-images').getPublicUrl(data.path)

    return urlData.publicUrl
  } catch (error) {
    console.error('上传评论图片错误:', error)
    throw error
  }
}

/**
 * 批量上传评论图片
 * @param filePaths 本地文件路径数组
 * @param userId 用户ID
 * @returns 上传后的公开URL数组
 */
export async function uploadCommentImages(filePaths: string[], userId: string): Promise<string[]> {
  const uploadPromises = filePaths.map((path) => uploadCommentImage(path, userId))
  return Promise.all(uploadPromises)
}
