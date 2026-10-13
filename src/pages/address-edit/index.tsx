import {Button, Input, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {createAddress, getAddressDetail, updateAddress} from '@/db/api'
import {parseAddressText} from '@/utils/addressParser'
import {getCountryPhoneRule, getOverseasShippingPlans, OVERSEAS_COUNTRIES, validatePhone} from '@/utils/shippingPlans'

// 中国大陆省市区数据（不含港澳台）
const REGION_DATA = {
  provinces: [
    '北京市',
    '天津市',
    '河北省',
    '山西省',
    '内蒙古自治区',
    '辽宁省',
    '吉林省',
    '黑龙江省',
    '上海市',
    '江苏省',
    '浙江省',
    '安徽省',
    '福建省',
    '江西省',
    '山东省',
    '河南省',
    '湖北省',
    '湖南省',
    '广东省',
    '广西壮族自治区',
    '海南省',
    '重庆市',
    '四川省',
    '贵州省',
    '云南省',
    '西藏自治区',
    '陕西省',
    '甘肃省',
    '青海省',
    '宁夏回族自治区',
    '新疆维吾尔自治区'
  ],
  cities: {
    北京市: ['北京市'],
    天津市: ['天津市'],
    河北省: [
      '石家庄市',
      '唐山市',
      '秦皇岛市',
      '邯郸市',
      '邢台市',
      '保定市',
      '张家口市',
      '承德市',
      '沧州市',
      '廊坊市',
      '衡水市'
    ],
    山西省: [
      '太原市',
      '大同市',
      '阳泉市',
      '长治市',
      '晋城市',
      '朔州市',
      '晋中市',
      '运城市',
      '忻州市',
      '临汾市',
      '吕梁市'
    ],
    内蒙古自治区: [
      '呼和浩特市',
      '包头市',
      '乌海市',
      '赤峰市',
      '通辽市',
      '鄂尔多斯市',
      '呼伦贝尔市',
      '巴彦淖尔市',
      '乌兰察布市'
    ],
    辽宁省: [
      '沈阳市',
      '大连市',
      '鞍山市',
      '抚顺市',
      '本溪市',
      '丹东市',
      '锦州市',
      '营口市',
      '阜新市',
      '辽阳市',
      '盘锦市',
      '铁岭市',
      '朝阳市',
      '葫芦岛市'
    ],
    吉林省: ['长春市', '吉林市', '四平市', '辽源市', '通化市', '白山市', '松原市', '白城市', '延边朝鲜族自治州'],
    黑龙江省: [
      '哈尔滨市',
      '齐齐哈尔市',
      '鸡西市',
      '鹤岗市',
      '双鸭山市',
      '大庆市',
      '伊春市',
      '佳木斯市',
      '七台河市',
      '牡丹江市',
      '黑河市',
      '绥化市',
      '大兴安岭地区'
    ],
    上海市: ['上海市'],
    江苏省: [
      '南京市',
      '无锡市',
      '徐州市',
      '常州市',
      '苏州市',
      '南通市',
      '连云港市',
      '淮安市',
      '盐城市',
      '扬州市',
      '镇江市',
      '泰州市',
      '宿迁市'
    ],
    浙江省: [
      '杭州市',
      '宁波市',
      '温州市',
      '嘉兴市',
      '湖州市',
      '绍兴市',
      '金华市',
      '衢州市',
      '舟山市',
      '台州市',
      '丽水市'
    ],
    安徽省: [
      '合肥市',
      '芜湖市',
      '蚌埠市',
      '淮南市',
      '马鞍山市',
      '淮北市',
      '铜陵市',
      '安庆市',
      '黄山市',
      '滁州市',
      '阜阳市',
      '宿州市',
      '六安市',
      '亳州市',
      '池州市',
      '宣城市'
    ],
    福建省: ['福州市', '厦门市', '莆田市', '三明市', '泉州市', '漳州市', '南平市', '龙岩市', '宁德市'],
    江西省: [
      '南昌市',
      '景德镇市',
      '萍乡市',
      '九江市',
      '新余市',
      '鹰潭市',
      '赣州市',
      '吉安市',
      '宜春市',
      '抚州市',
      '上饶市'
    ],
    山东省: [
      '济南市',
      '青岛市',
      '淄博市',
      '枣庄市',
      '东营市',
      '烟台市',
      '潍坊市',
      '济宁市',
      '泰安市',
      '威海市',
      '日照市',
      '临沂市',
      '德州市',
      '聊城市',
      '滨州市',
      '菏泽市'
    ],
    河南省: [
      '郑州市',
      '开封市',
      '洛阳市',
      '平顶山市',
      '安阳市',
      '鹤壁市',
      '新乡市',
      '焦作市',
      '濮阳市',
      '许昌市',
      '漯河市',
      '三门峡市',
      '南阳市',
      '商丘市',
      '信阳市',
      '周口市',
      '驻马店市'
    ],
    湖北省: [
      '武汉市',
      '黄石市',
      '十堰市',
      '宜昌市',
      '襄阳市',
      '鄂州市',
      '荆门市',
      '孝感市',
      '荆州市',
      '黄冈市',
      '咸宁市',
      '随州市',
      '恩施土家族苗族自治州'
    ],
    湖南省: [
      '长沙市',
      '株洲市',
      '湘潭市',
      '衡阳市',
      '邵阳市',
      '岳阳市',
      '常德市',
      '张家界市',
      '益阳市',
      '郴州市',
      '永州市',
      '怀化市',
      '娄底市',
      '湘西土家族苗族自治州'
    ],
    广东省: [
      '广州市',
      '韶关市',
      '深圳市',
      '珠海市',
      '汕头市',
      '佛山市',
      '江门市',
      '湛江市',
      '茂名市',
      '肇庆市',
      '惠州市',
      '梅州市',
      '汕尾市',
      '河源市',
      '阳江市',
      '清远市',
      '东莞市',
      '中山市',
      '潮州市',
      '揭阳市',
      '云浮市'
    ],
    广西壮族自治区: [
      '南宁市',
      '柳州市',
      '桂林市',
      '梧州市',
      '北海市',
      '防城港市',
      '钦州市',
      '贵港市',
      '玉林市',
      '百色市',
      '贺州市',
      '河池市',
      '来宾市',
      '崇左市'
    ],
    海南省: ['海口市', '三亚市', '三沙市', '儋州市'],
    重庆市: ['重庆市'],
    四川省: [
      '成都市',
      '自贡市',
      '攀枝花市',
      '泸州市',
      '德阳市',
      '绵阳市',
      '广元市',
      '遂宁市',
      '内江市',
      '乐山市',
      '南充市',
      '眉山市',
      '宜宾市',
      '广安市',
      '达州市',
      '雅安市',
      '巴中市',
      '资阳市',
      '阿坝藏族羌族自治州',
      '甘孜藏族自治州',
      '凉山彝族自治州'
    ],
    贵州省: [
      '贵阳市',
      '六盘水市',
      '遵义市',
      '安顺市',
      '毕节市',
      '铜仁市',
      '黔西南布依族苗族自治州',
      '黔东南苗族侗族自治州',
      '黔南布依族苗族自治州'
    ],
    云南省: [
      '昆明市',
      '曲靖市',
      '玉溪市',
      '保山市',
      '昭通市',
      '丽江市',
      '普洱市',
      '临沧市',
      '楚雄彝族自治州',
      '红河哈尼族彝族自治州',
      '文山壮族苗族自治州',
      '西双版纳傣族自治州',
      '大理白族自治州',
      '德宏傣族景颇族自治州',
      '怒江傈僳族自治州',
      '迪庆藏族自治州'
    ],
    西藏自治区: ['拉萨市', '日喀则市', '昌都市', '林芝市', '山南市', '那曲市', '阿里地区'],
    陕西省: ['西安市', '铜川市', '宝鸡市', '咸阳市', '渭南市', '延安市', '汉中市', '榆林市', '安康市', '商洛市'],
    甘肃省: [
      '兰州市',
      '嘉峪关市',
      '金昌市',
      '白银市',
      '天水市',
      '武威市',
      '张掖市',
      '平凉市',
      '酒泉市',
      '庆阳市',
      '定西市',
      '陇南市',
      '临夏回族自治州',
      '甘南藏族自治州'
    ],
    青海省: [
      '西宁市',
      '海东市',
      '海北藏族自治州',
      '黄南藏族自治州',
      '海南藏族自治州',
      '果洛藏族自治州',
      '玉树藏族自治州',
      '海西蒙古族藏族自治州'
    ],
    宁夏回族自治区: ['银川市', '石嘴山市', '吴忠市', '固原市', '中卫市'],
    新疆维吾尔自治区: [
      '乌鲁木齐市',
      '克拉玛依市',
      '吐鲁番市',
      '哈密市',
      '昌吉回族自治州',
      '博尔塔拉蒙古自治州',
      '巴音郭楞蒙古自治州',
      '阿克苏地区',
      '克孜勒苏柯尔克孜自治州',
      '喀什地区',
      '和田地区',
      '伊犁哈萨克自治州',
      '塔城地区',
      '阿勒泰地区'
    ]
  },
  districts: {
    北京市: [
      '东城区',
      '西城区',
      '朝阳区',
      '丰台区',
      '石景山区',
      '海淀区',
      '门头沟区',
      '房山区',
      '通州区',
      '顺义区',
      '昌平区',
      '大兴区',
      '怀柔区',
      '平谷区',
      '密云区',
      '延庆区'
    ],
    天津市: [
      '和平区',
      '河东区',
      '河西区',
      '南开区',
      '河北区',
      '红桥区',
      '东丽区',
      '西青区',
      '津南区',
      '北辰区',
      '武清区',
      '宝坻区',
      '滨海新区',
      '宁河区',
      '静海区',
      '蓟州区'
    ],
    上海市: [
      '黄浦区',
      '徐汇区',
      '长宁区',
      '静安区',
      '普陀区',
      '虹口区',
      '杨浦区',
      '闵行区',
      '宝山区',
      '嘉定区',
      '浦东新区',
      '金山区',
      '松江区',
      '青浦区',
      '奉贤区',
      '崇明区'
    ],
    重庆市: [
      '万州区',
      '涪陵区',
      '渝中区',
      '大渡口区',
      '江北区',
      '沙坪坝区',
      '九龙坡区',
      '南岸区',
      '北碚区',
      '綦江区',
      '大足区',
      '渝北区',
      '巴南区',
      '黔江区',
      '长寿区',
      '江津区',
      '合川区',
      '永川区',
      '南川区',
      '璧山区',
      '铜梁区',
      '潼南区',
      '荣昌区',
      '开州区',
      '梁平区',
      '武隆区'
    ],
    石家庄市: ['长安区', '桥西区', '新华区', '井陉矿区', '裕华区', '藁城区', '鹿泉区', '栾城区'],
    唐山市: ['路南区', '路北区', '古冶区', '开平区', '丰南区', '丰润区', '曹妃甸区'],
    秦皇岛市: ['海港区', '山海关区', '北戴河区', '抚宁区'],
    邯郸市: [
      '邯山区',
      '丛台区',
      '复兴区',
      '峰峰矿区',
      '肥乡区',
      '永年区',
      '临漳县',
      '成安县',
      '大名县',
      '涉县',
      '磁县',
      '邱县',
      '鸡泽县',
      '广平县',
      '馆陶县',
      '魏县',
      '曲周县',
      '武安市'
    ],
    // 其他城市的区县数据可以继续补充，这里先提供主要城市
    太原市: ['小店区', '迎泽区', '杏花岭区', '尖草坪区', '万柏林区', '晋源区'],
    沈阳市: [
      '和平区',
      '沈河区',
      '大东区',
      '皇姑区',
      '铁西区',
      '苏家屯区',
      '浑南区',
      '沈北新区',
      '于洪区',
      '辽中区',
      '康平县',
      '法库县',
      '新民市'
    ],
    大连市: ['中山区', '西岗区', '沙河口区', '甘井子区', '旅顺口区', '金州区', '普兰店区', '瓦房店市', '庄河市'],
    长春市: ['南关区', '宽城区', '朝阳区', '二道区', '绿园区', '双阳区', '九台区', '农安县', '榆树市', '德惠市'],
    哈尔滨市: [
      '道里区',
      '南岗区',
      '道外区',
      '平房区',
      '松北区',
      '香坊区',
      '呼兰区',
      '阿城区',
      '双城区',
      '依兰县',
      '方正县',
      '宾县',
      '巴彦县',
      '木兰县',
      '通河县',
      '延寿县',
      '尚志市',
      '五常市'
    ],
    南京市: [
      '玄武区',
      '秦淮区',
      '建邺区',
      '鼓楼区',
      '浦口区',
      '栖霞区',
      '雨花台区',
      '江宁区',
      '六合区',
      '溧水区',
      '高淳区'
    ],
    苏州市: ['虎丘区', '吴中区', '相城区', '姑苏区', '吴江区', '常熟市', '张家港市', '昆山市', '太仓市'],
    杭州市: [
      '上城区',
      '下城区',
      '江干区',
      '拱墅区',
      '西湖区',
      '滨江区',
      '萧山区',
      '余杭区',
      '富阳区',
      '临安区',
      '桐庐县',
      '淳安县',
      '建德市'
    ],
    宁波市: ['海曙区', '江北区', '北仑区', '镇海区', '鄞州区', '奉化区', '象山县', '宁海县', '余姚市', '慈溪市'],
    合肥市: ['瑶海区', '庐阳区', '蜀山区', '包河区', '长丰县', '肥东县', '肥西县', '庐江县', '巢湖市'],
    福州市: [
      '鼓楼区',
      '台江区',
      '仓山区',
      '马尾区',
      '晋安区',
      '长乐区',
      '闽侯县',
      '连江县',
      '罗源县',
      '闽清县',
      '永泰县',
      '平潭县',
      '福清市'
    ],
    厦门市: ['思明区', '海沧区', '湖里区', '集美区', '同安区', '翔安区'],
    南昌市: ['东湖区', '西湖区', '青云谱区', '湾里区', '青山湖区', '新建区', '南昌县', '安义县', '进贤县'],
    济南市: [
      '历下区',
      '市中区',
      '槐荫区',
      '天桥区',
      '历城区',
      '长清区',
      '章丘区',
      '济阳区',
      '莱芜区',
      '钢城区',
      '平阴县',
      '商河县'
    ],
    青岛市: ['市南区', '市北区', '黄岛区', '崂山区', '李沧区', '城阳区', '即墨区', '胶州市', '平度市', '莱西市'],
    郑州市: [
      '中原区',
      '二七区',
      '管城回族区',
      '金水区',
      '上街区',
      '惠济区',
      '中牟县',
      '巩义市',
      '荥阳市',
      '新密市',
      '新郑市',
      '登封市'
    ],
    武汉市: [
      '江岸区',
      '江汉区',
      '硚口区',
      '汉阳区',
      '武昌区',
      '青山区',
      '洪山区',
      '东西湖区',
      '汉南区',
      '蔡甸区',
      '江夏区',
      '黄陂区',
      '新洲区'
    ],
    长沙市: ['芙蓉区', '天心区', '岳麓区', '开福区', '雨花区', '望城区', '长沙县', '浏阳市', '宁乡市'],
    广州市: [
      '荔湾区',
      '越秀区',
      '海珠区',
      '天河区',
      '白云区',
      '黄埔区',
      '番禺区',
      '花都区',
      '南沙区',
      '从化区',
      '增城区'
    ],
    深圳市: ['罗湖区', '福田区', '南山区', '宝安区', '龙岗区', '盐田区', '龙华区', '坪山区', '光明区', '大鹏新区'],
    成都市: [
      '锦江区',
      '青羊区',
      '金牛区',
      '武侯区',
      '成华区',
      '龙泉驿区',
      '青白江区',
      '新都区',
      '温江区',
      '双流区',
      '郫都区',
      '新津区',
      '金堂县',
      '大邑县',
      '蒲江县',
      '都江堰市',
      '彭州市',
      '邛崃市',
      '崇州市',
      '简阳市'
    ],
    西安市: [
      '新城区',
      '碑林区',
      '莲湖区',
      '灞桥区',
      '未央区',
      '雁塔区',
      '阎良区',
      '临潼区',
      '长安区',
      '高陵区',
      '鄠邑区',
      '蓝田县',
      '周至县'
    ]
  }
}

// 偏远地区列表（不包邮）
const REMOTE_AREAS = [
  '西藏自治区',
  '新疆维吾尔自治区',
  '内蒙古自治区',
  '青海省',
  '甘肃省',
  '宁夏回族自治区',
  '黑龙江省',
  '吉林省'
]

export default function AddressEdit() {
  const router = useRouter()
  const {user} = useAuth()
  const {id} = router.params
  const [formData, setFormData] = useState({
    receiver_name: '',
    phone: '',
    province: '北京市',
    city: '北京市',
    district: '朝阳区',
    detail: '',
    is_default: false,
    is_overseas: false,
    country: '',
    overseas_detail: ''
  })
  const [loading, setLoading] = useState(false)
  const [availableCities, setAvailableCities] = useState<string[]>(['北京市'])
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([
    '东城区',
    '西城区',
    '朝阳区',
    '海淀区',
    '丰台区',
    '石景山区'
  ])

  const loadAddress = useCallback(async () => {
    const {data} = await getAddressDetail(id!)
    if (data) {
      setFormData({
        receiver_name: data.receiver_name,
        phone: data.phone,
        province: data.province,
        city: data.city,
        district: data.district,
        detail: data.detail,
        is_default: data.is_default,
        is_overseas: data.is_overseas || false,
        country: data.country || '',
        overseas_detail: data.overseas_detail || ''
      })
      // 更新可选城市和区县
      const cities = (REGION_DATA.cities as any)[data.province] || []
      setAvailableCities(cities)
      const districts = (REGION_DATA.districts as any)[data.city] || []
      setAvailableDistricts(districts)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      loadAddress()
    }
  }, [id, loadAddress])

  const updateField = (field: string, value: any) => {
    setFormData((current) => ({...current, [field]: value}))
  }

  const handleProvinceChange = (e: any) => {
    const provinceIndex = e.detail.value
    const province = REGION_DATA.provinces[provinceIndex]
    const cities = (REGION_DATA.cities as any)[province] || []
    const city = cities[0] || ''
    const districts = (REGION_DATA.districts as any)[city] || []
    const district = districts[0] || ''

    setAvailableCities(cities)
    setAvailableDistricts(districts)
    setFormData({
      ...formData,
      province,
      city,
      district
    })
  }

  const handleCityChange = (e: any) => {
    const cityIndex = e.detail.value
    const city = availableCities[cityIndex]
    const districts = (REGION_DATA.districts as any)[city] || []
    const district = districts[0] || ''

    setAvailableDistricts(districts)
    setFormData({
      ...formData,
      city,
      district
    })
  }

  // 粘贴板智能识别：读取剪贴板文本并自动拆分填入各字段
  const handlePaste = async () => {
    try {
      const {data} = await Taro.getClipboardData()
      const text = (data || '').trim()
      if (!text) {
        Taro.showToast({title: '剪贴板为空', icon: 'none'})
        return
      }
      const parsed = parseAddressText(text)
      if (!parsed) {
        Taro.showModal({title: '识别失败', content: '未识别到有效地址信息，请检查文本后手动填写', showCancel: false})
        return
      }
      const next = {...formData}
      let filled = 0
      if (parsed.receiver_name) {
        next.receiver_name = parsed.receiver_name
        filled++
      }
      if (parsed.phone) {
        next.phone = parsed.phone
        filled++
      }
      if (parsed.province) {
        next.province = parsed.province
        filled++
      }
      if (parsed.city) {
        next.city = parsed.city
        filled++
      }
      if (parsed.district) {
        next.district = parsed.district
        filled++
      }
      if (parsed.detail) {
        next.detail = parsed.detail
        filled++
      }
      // 同步城市/区县下拉
      const cities = (REGION_DATA.cities as any)[next.province] || availableCities
      setAvailableCities(cities)
      const districts = (REGION_DATA.districts as any)[next.city] || availableDistricts
      setAvailableDistricts(districts)
      setFormData(next)
      Taro.showToast({title: `已识别${filled}项`, icon: 'success'})
    } catch {
      Taro.showToast({title: '读取剪贴板失败', icon: 'none'})
    }
  }

  const handleSubmit = async () => {
    if (!user) {
      Taro.showToast({title: '请先登录', icon: 'none'})
      return
    }

    if (!formData.receiver_name.trim()) {
      Taro.showToast({title: '请输入收货人姓名', icon: 'none'})
      return
    }

    if (!formData.phone.trim()) {
      Taro.showToast({title: '请输入联系电话', icon: 'none'})
      return
    }

    if (!validatePhone(formData.phone, formData.is_overseas, formData.country)) {
      const rule = getCountryPhoneRule(formData.is_overseas ? formData.country : '')
      Taro.showToast({title: formData.is_overseas ? rule.hint : '请输入正确的手机号', icon: 'none'})
      return
    }

    if (formData.is_overseas) {
      if (!formData.country.trim()) {
        Taro.showToast({title: '请选择目的国家', icon: 'none'})
        return
      }
      if (!formData.overseas_detail.trim()) {
        Taro.showToast({title: '请输入海外详细地址', icon: 'none'})
        return
      }
    } else if (!formData.detail.trim()) {
      Taro.showToast({title: '请输入详细地址', icon: 'none'})
      return
    }

    setLoading(true)

    try {
      const addressData = {
        ...formData,
        user_id: user.id
      }

      if (id) {
        const {error} = await updateAddress(id, {...formData, user_id: user.id})
        if (error) throw error
      } else {
        const {error} = await createAddress(addressData)
        if (error) throw error
      }

      Taro.showToast({title: '保存成功', icon: 'success'})
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } catch (error: any) {
      Taro.showToast({title: error.message || '保存失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <ScrollView className="flex-1 pb-24" scrollY>
        <View className="p-4">
          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <View className="flex flex-row items-center justify-between mb-4">
              <Text className="text-base font-bold text-foreground">收货人信息</Text>
              <View
                className="flex flex-row items-center bg-primary/10 rounded-full px-3 py-1.5 active:scale-95 transition-all"
                onClick={handlePaste}>
                <View className="i-mdi-content-paste text-base text-primary mr-1" />
                <Text className="text-sm text-primary font-bold">粘贴识别</Text>
              </View>
            </View>
            <View className="space-y-4">
              <View>
                <Text className="text-base text-muted-foreground mb-2">收货人姓名 *</Text>
                <View className="bg-input rounded-lg border border-border px-3 py-2">
                  <Input
                    className="w-full text-foreground"
                    placeholder="请输入收货人姓名"
                    value={formData.receiver_name}
                    onInput={(e) => updateField('receiver_name', e.detail.value)}
                  />
                </View>
              </View>
              <View>
                <Text className="text-base text-muted-foreground mb-2">联系电话 *</Text>
                <View className="bg-input rounded-lg border border-border px-3 py-2">
                  <Input
                    className="w-full text-foreground"
                    placeholder={
                      formData.is_overseas ? getCountryPhoneRule(formData.country).placeholder : '请输入11位手机号'
                    }
                    type="number"
                    maxlength={formData.is_overseas ? getCountryPhoneRule(formData.country).max : 11}
                    value={formData.phone}
                    onInput={(e) => updateField('phone', e.detail.value)}
                  />
                </View>
                {formData.is_overseas ? (
                  <Text className="text-xs text-muted-foreground mt-1 block">
                    {getCountryPhoneRule(formData.country).hint}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          <View className="bg-card rounded-xl p-4 mb-4 shadow-card">
            <View className="flex flex-row items-center justify-between mb-2">
              <Text className="text-base font-bold text-foreground">收货地址</Text>
              <View
                className="flex flex-row items-center active:scale-95 transition-all"
                onClick={() => updateField('is_overseas', !formData.is_overseas)}>
                <Text className="text-sm text-muted-foreground mr-2">
                  {formData.is_overseas ? '海外地址' : '国内地址'}
                </Text>
                <View
                  className={`w-12 h-6 rounded-full transition-colors ${formData.is_overseas ? 'bg-primary' : 'bg-muted'}`}>
                  <View
                    className={`w-5 h-5 bg-white rounded-full mt-0.5 shadow transition-transform ${formData.is_overseas ? 'ml-6' : 'ml-0.5'}`}
                  />
                </View>
              </View>
            </View>

            {!formData.is_overseas ? (
              <View>
                <Text className="text-base text-muted-foreground mt-2 mb-4">
                  支持中国大陆所有省市（不含港澳台及海外地区）
                </Text>
                <View className="space-y-4">
                  <View>
                    <Text className="text-base text-muted-foreground mb-2">省份</Text>
                    <Picker
                      mode="selector"
                      range={REGION_DATA.provinces}
                      value={REGION_DATA.provinces.indexOf(formData.province)}
                      onChange={handleProvinceChange}>
                      <View className="bg-input rounded-lg border border-border px-3 py-3">
                        <Text className="text-foreground">{formData.province}</Text>
                      </View>
                    </Picker>
                  </View>
                  <View>
                    <Text className="text-base text-muted-foreground mb-2">城市</Text>
                    <Picker
                      mode="selector"
                      range={availableCities}
                      value={availableCities.indexOf(formData.city)}
                      onChange={handleCityChange}>
                      <View className="bg-input rounded-lg border border-border px-3 py-3">
                        <Text className="text-foreground">{formData.city}</Text>
                      </View>
                    </Picker>
                  </View>
                  <View>
                    <Text className="text-base text-muted-foreground mb-2">详细地址 *</Text>
                    <View className="bg-input rounded-lg border border-border px-3 py-2">
                      <Input
                        className="w-full text-foreground"
                        placeholder="街道、楼牌号等详细信息"
                        value={formData.detail}
                        onInput={(e) => updateField('detail', e.detail.value)}
                      />
                    </View>
                  </View>
                </View>

                {REMOTE_AREAS.includes(formData.province) && (
                  <View className="bg-yellow-50 rounded-lg p-3 mt-4 border border-yellow-200">
                    <View className="flex items-start">
                      <View className="i-mdi-alert text-lg text-yellow-600 mr-2 mt-0.5" />
                      <Text className="text-base text-yellow-800 flex-1">
                        您选择的地区属于偏远地区，快递配送可能需要额外运费，建议选择线下自提或联系客服确认运费
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View>
                <Text className="text-base text-muted-foreground mt-2 mb-4">
                  支持海外收货地址，选择目的国家后将预估国际物流方案
                </Text>
                <View className="space-y-4">
                  <View>
                    <Text className="text-base text-muted-foreground mb-2">目的国家 *</Text>
                    <Picker
                      mode="selector"
                      range={OVERSEAS_COUNTRIES}
                      value={OVERSEAS_COUNTRIES.indexOf(formData.country)}
                      onChange={(e: any) => updateField('country', OVERSEAS_COUNTRIES[e.detail.value])}>
                      <View className="bg-input rounded-lg border border-border px-3 py-3">
                        <Text className="text-foreground">{formData.country || '请选择目的国家'}</Text>
                      </View>
                    </Picker>
                  </View>
                  <View>
                    <Text className="text-base text-muted-foreground mb-2">海外详细地址 *</Text>
                    <View className="bg-input rounded-lg border border-border px-3 py-2">
                      <Input
                        className="w-full text-foreground"
                        placeholder="State / City / Street / ZIP 等英文或中文地址"
                        value={formData.overseas_detail}
                        onInput={(e) => updateField('overseas_detail', e.detail.value)}
                      />
                    </View>
                  </View>
                </View>

                {formData.country ? (
                  <View className="mt-4 bg-primary/5 rounded-xl p-4 border border-primary/15">
                    <View className="flex flex-row items-center mb-3">
                      <View className="i-mdi-truck-fast text-xl text-primary mr-2" />
                      <Text className="text-base font-bold text-primary">国际物流方案预估</Text>
                    </View>
                    {getOverseasShippingPlans(formData.country).map((plan, pi) => (
                      <View key={pi} className="bg-card rounded-xl p-3 mb-2 border border-border border-opacity-10">
                        <View className="flex flex-row items-center justify-between mb-1">
                          <Text className="text-sm font-bold text-foreground flex-1">{plan.carrier}</Text>
                          <Text className="text-sm text-primary font-bold">{plan.costRange}</Text>
                        </View>
                        <View className="flex flex-row items-center justify-between">
                          <Text className="text-xs text-muted-foreground flex-1">{plan.note}</Text>
                          <Text className="text-xs text-muted-foreground ml-2">约 {plan.daysRange}</Text>
                        </View>
                      </View>
                    ))}
                    <Text className="text-xs text-muted-foreground mt-1 block">
                      以上费用与时效为公开常识性参考区间，实际以承运商确认为准
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>

          <View className="bg-card rounded-xl p-4 shadow-card">
            <View
              className="flex items-center justify-between"
              onClick={() => updateField('is_default', !formData.is_default)}>
              <Text className="text-base text-foreground">设为默认地址</Text>
              <View
                className={`w-12 h-6 rounded-full transition-colors ${formData.is_default ? 'bg-primary' : 'bg-muted'}`}>
                <View
                  className={`w-5 h-5 bg-white rounded-full mt-0.5 shadow transition-transform ${formData.is_default ? 'ml-6' : 'ml-0.5'}`}
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="fixed bottom-0 left-0 right-0 bg-card p-4 border-t border-border">
        <Button
          className="w-full bg-gradient-primary text-white rounded-full py-3 text-base font-bold break-keep"
          onClick={handleSubmit}
          loading={loading}>
          保存地址
        </Button>
      </View>
    </View>
  )
}
