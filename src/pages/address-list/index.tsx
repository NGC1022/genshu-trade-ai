import {Button, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow, useRouter} from '@tarojs/taro'
import {useCallback, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {deleteAddress, getUserAddresses, setDefaultAddress} from '@/db/api'
import type {Address} from '@/db/types'

export default function AddressList() {
  const router = useRouter()
  const {user} = useAuth()
  const {select} = router.params
  const [addresses, setAddresses] = useState<Address[]>([])
  const [activeId, setActiveId] = useState<string>('') // 当前展开操作项（滑动操作反馈）

  const loadAddresses = useCallback(async () => {
    if (!user) return
    const {data} = await getUserAddresses(user.id)
    setAddresses(data)
  }, [user])

  useDidShow(() => {
    loadAddresses()
  })

  const handleSelect = (address: Address) => {
    if (select === 'true') {
      const pages = Taro.getCurrentPages()
      const prevPage = pages[pages.length - 2]
      if (prevPage) {
        prevPage.setData({selectedAddress: address})
      }
      Taro.navigateBack()
    }
  }

  const handleEdit = (id: string) => {
    Taro.navigateTo({url: `/pages/address-edit/index?id=${id}`})
  }

  const handleAdd = () => {
    Taro.navigateTo({url: '/pages/address-edit/index'})
  }

  const handleSetDefault = async (id: string) => {
    if (!user) return
    try {
      const {error} = await setDefaultAddress(id, user.id)
      if (error) throw error
      Taro.showToast({title: '设置成功', icon: 'success'})
      setActiveId('')
      loadAddresses()
    } catch (error: any) {
      Taro.showToast({title: error.message || '设置失败', icon: 'none'})
    }
  }

  const handleDelete = (id: string) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这个地址吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const {error} = await deleteAddress(id)
            if (error) throw error
            Taro.showToast({title: '删除成功', icon: 'success'})
            setActiveId('')
            loadAddresses()
          } catch (error: any) {
            Taro.showToast({title: error.message || '删除失败', icon: 'none'})
          }
        }
      }
    })
  }

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <ScrollView className="flex-1 p-4 pb-24" scrollY>
        {addresses.length === 0 ? (
          <View className="flex flex-col items-center justify-center py-20">
            <View className="i-mdi-map-marker-outline text-6xl text-muted-foreground mb-4" />
            <Text className="text-muted-foreground mb-4">暂无收货地址</Text>
            <Button
              className="bg-gradient-primary text-white rounded-full px-8 py-2 text-base break-keep"
              onClick={handleAdd}>
              添加地址
            </Button>
          </View>
        ) : (
          addresses.map((address) => {
            const isDefault = address.is_default
            const isExpanded = activeId === address.id
            return (
              <View
                key={address.id}
                className={`mb-4 rounded-3xl overflow-hidden border transition-all ${
                  isDefault
                    ? 'border-primary/40 shadow-[0_10px_28px_-12px_rgba(180,83,9,0.35)]'
                    : 'border-border border-opacity-10 shadow-card'
                }`}>
                {/* 默认地址高亮顶部条 */}
                {isDefault ? <View className="h-1 bg-gradient-primary w-full" /> : null}
                <View
                  className={`bg-card p-5 ${isDefault ? 'bg-primary/5' : ''} active:scale-[0.99] transition-all`}
                  onClick={() => handleSelect(address)}>
                  <View className="flex flex-row items-center justify-between mb-3">
                    <View className="flex flex-row items-center flex-1 min-w-0">
                      <Text className="text-lg font-bold text-foreground mr-2 truncate">{address.receiver_name}</Text>
                      <Text className="text-base text-muted-foreground mr-2">{address.phone}</Text>
                      {isDefault ? (
                        <View className="flex flex-row items-center bg-primary rounded-full px-2 py-0.5">
                          <View className="i-mdi-star text-xs text-primary-foreground mr-0.5" />
                          <Text className="text-xs text-primary-foreground font-bold">默认</Text>
                        </View>
                      ) : null}
                      {address.is_overseas ? (
                        <View className="flex flex-row items-center bg-secondary rounded-full px-2 py-0.5 ml-1">
                          <View className="i-mdi-earth text-xs text-secondary-foreground mr-0.5" />
                          <Text className="text-xs text-secondary-foreground font-bold">海外</Text>
                        </View>
                      ) : null}
                    </View>
                    {select !== 'true' ? (
                      <View
                        className="i-mdi-dots-horizontal text-xl text-muted-foreground ml-2 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveId(isExpanded ? '' : address.id)
                        }}
                      />
                    ) : null}
                  </View>
                  <View className="flex flex-row items-start">
                    <View className="i-mdi-map-marker text-lg text-primary mt-0.5 mr-2 flex-shrink-0" />
                    <Text className="text-base text-foreground leading-relaxed flex-1">
                      {address.is_overseas
                        ? `${address.country || '海外'} ${address.overseas_detail || ''}`
                        : `${address.province} ${address.city} ${address.district} ${address.detail}`}
                    </Text>
                  </View>

                  {/* 滑动展开的操作区（操作反馈） */}
                  {isExpanded && select !== 'true' ? (
                    <View className="flex flex-row items-center gap-3 mt-4 pt-4 border-t border-border border-opacity-10">
                      <View
                        className="flex-1 flex flex-row items-center justify-center bg-muted/60 rounded-2xl py-2.5 active:scale-95 transition-all"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(address.id)
                        }}>
                        <View className="i-mdi-pencil text-base text-foreground mr-1" />
                        <Text className="text-sm text-foreground font-bold">编辑</Text>
                      </View>
                      {!isDefault ? (
                        <View
                          className="flex-1 flex flex-row items-center justify-center bg-primary/10 rounded-2xl py-2.5 active:scale-95 transition-all"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSetDefault(address.id)
                          }}>
                          <View className="i-mdi-star-outline text-base text-primary mr-1" />
                          <Text className="text-sm text-primary font-bold">设默认</Text>
                        </View>
                      ) : null}
                      <View
                        className="flex-1 flex flex-row items-center justify-center bg-destructive/10 rounded-2xl py-2.5 active:scale-95 transition-all"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(address.id)
                        }}>
                        <View className="i-mdi-delete-outline text-base text-destructive mr-1" />
                        <Text className="text-sm text-destructive font-bold">删除</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>
            )
          })
        )}
      </ScrollView>

      {addresses.length > 0 && (
        <View className="fixed bottom-0 left-0 right-0 bg-card p-4 border-t border-border">
          <Button
            className="w-full bg-gradient-primary text-white rounded-full py-3 text-base font-bold break-keep"
            onClick={handleAdd}>
            添加新地址
          </Button>
        </View>
      )}
    </View>
  )
}
