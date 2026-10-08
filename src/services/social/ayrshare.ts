import {supabase} from '@/client/supabase'

export type SocialPlatform = 'instagram' | 'facebook'
export type SocialPostInput = {
  post: string | Record<string, string>
  platforms: SocialPlatform[]
  mediaUrls?: string[] | Record<string, string>
  scheduleDate?: string
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const {data, error} = await supabase.functions.invoke('ayrshare-social', {body})
  if (error) throw error
  if (data?.status === 'error') throw new Error(data.message || '社交平台操作失败')
  return data as T
}

export function createSocialLink() {
  return invoke<{url: string; token: string}>({action: 'link'})
}
export function validateSocialPost(input: SocialPostInput) {
  return invoke<Record<string, unknown>>({action: 'validate', ...input})
}
export function submitSocialPost(input: SocialPostInput) {
  return invoke<Record<string, unknown>>({action: 'publish', ...input})
}
export function approveSocialPost(postId: string) {
  return invoke<Record<string, unknown>>({action: 'approve', postId})
}
