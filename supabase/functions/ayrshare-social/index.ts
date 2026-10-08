import {createClient} from 'npm:@supabase/supabase-js@2'

const API = 'https://api.ayrshare.com/api'
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ayrshareKey = Deno.env.get('AYRSHARE_API_KEY')!
const admin = createClient(supabaseUrl, serviceKey)
const headers = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'}

type Action = 'link' | 'validate' | 'publish' | 'approve'
type RequestBody = {
  action: Action
  post?: string | Record<string, string>
  mediaUrls?: string[] | Record<string, string>
  platforms?: string[]
  scheduleDate?: string
  postId?: string
}
function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {status, headers: {...headers, 'Content-Type': 'application/json'}})
}
async function ayrshare(path: string, init: RequestInit = {}, profileKey?: string) {
  const requestHeaders = new Headers(init.headers)
  requestHeaders.set('Authorization', `Bearer ${ayrshareKey}`)
  requestHeaders.set('Content-Type', 'application/json')
  if (profileKey) requestHeaders.set('Profile-Key', profileKey)
  return fetch(`${API}${path}`, {...init, headers: requestHeaders})
}
async function getUser(req: Request) {
  const auth = req.headers.get('Authorization')
  if (!auth) throw new Error('请先登录')
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {global: {headers: {Authorization: auth}}})
  const {data, error} = await userClient.auth.getUser()
  if (error || !data.user) throw new Error('登录状态已失效')
  return data.user
}
async function getOrCreateProfile(userId: string) {
  const {data: current, error: readError} = await admin.from('social_profiles').select('*').eq('user_id', userId).maybeSingle()
  if (readError) throw readError
  if (current) return current
  const create = await ayrshare('/profiles', {method: 'POST', body: JSON.stringify({title: `genshu-user-${userId.slice(0, 8)}`})})
  const payload = await create.json()
  if (!create.ok || !payload.profileKey) throw new Error(payload.message || 'Ayrshare 用户档案创建失败')
  const {data, error} = await admin.from('social_profiles').insert({user_id: userId, provider_profile_id: payload.refId || null, provider_profile_key: payload.profileKey}).select('*').single()
  if (error) throw error
  return data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers})
  try {
    if (!ayrshareKey) throw new Error('服务端尚未配置 AYRSHARE_API_KEY')
    const user = await getUser(req)
    const body = (await req.json()) as RequestBody
    const profile = await getOrCreateProfile(user.id)
    if (body.action === 'link') {
      const result = await ayrshare('/profiles/generateJWT', {method: 'POST', body: JSON.stringify({profileKey: profile.provider_profile_key, allowedSocial: ['instagram', 'facebook'], instagramLinkMethod: 'instagram', redirect: 'origin=true'})})
      return response(await result.json(), result.status)
    }
    if (body.action === 'validate' || body.action === 'publish') {
      if (!body.post || !body.platforms?.length) throw new Error('请提供文案和至少一个目标平台')
      const payload = {post: body.post, mediaUrls: body.mediaUrls, platforms: body.platforms, scheduleDate: body.scheduleDate, ...(body.action === 'publish' ? {requiresApproval: true} : {})}
      const result = await ayrshare(body.action === 'validate' ? '/validate/post' : '/post', {method: 'POST', body: JSON.stringify(payload)}, profile.provider_profile_key)
      return response(await result.json(), result.status)
    }
    if (body.action === 'approve') {
      if (!body.postId) throw new Error('缺少待审核帖子 ID')
      const result = await ayrshare(`/post/${encodeURIComponent(body.postId)}`, {method: 'PATCH', body: JSON.stringify({approved: true})}, profile.provider_profile_key)
      return response(await result.json(), result.status)
    }
    throw new Error('不支持的 action')
  } catch (error) {
    return response({status: 'error', message: error instanceof Error ? error.message : 'social action failed'}, 400)
  }
})
