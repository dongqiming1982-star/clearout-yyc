import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Globe2,
  Home,
  Mail,
  MapPin,
  Menu,
  Phone,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  X,
} from 'lucide-react'
import {
  areaOptions,
  providerAreaOptions,
  providerServiceOptions,
  requestCategories,
  normalizeDispatchArea,
  normalizeLeadServiceType,
  normalizeProviderDispatchAreas,
  normalizeProviderServiceTypes,
} from './shared/clearoutTaxonomy'
import type { DispatchArea } from './shared/clearoutTaxonomy'

const CUSTOMER_DESCRIPTION_MAX = 150
const PROVIDER_DESCRIPTION_MAX = 300

type Lang = 'en' | 'zh'
type Route =
  | { type: 'home' }
  | { type: 'request' }
  | { type: 'providerJoin' }
  | { type: 'providerLeads' }
  | { type: 'providerLead' }
  | { type: 'admin' }
  | { type: 'faq' }
  | { type: 'areas' }
  | { type: 'service'; slug: string }
  | { type: 'community'; slug: string }
  | { type: 'privacy' }
  | { type: 'terms' }

type Area = DispatchArea
type LeadStatus = 'submitted' | 'dispatched_free_beta' | 'rejected_special_item' | 'sold_partial' | 'exclusive_sold' | 'sold_out' | 'invalid' | 'closed'
type ApprovalStatus = 'submitted' | 'approved' | 'needs_verification' | 'suspended' | 'expired' | 'rejected'

type FileMeta = {
  file_name: string
  file_size: number
  file_type: string
  uploaded_at: string
  storage_path?: string
  review_status: 'not_uploaded' | 'uploaded' | 'approved' | 'rejected' | 'expired'
}

type LeadPhotoUpload = {
  file_name: string
  mime_type: string
  data_url: string
  file_size: number
  width: number
  height: number
  sort_order: number
}

type PreparedLeadPhoto = LeadPhotoUpload & {
  preview_url: string
  original_size: number
}

type LeadPhotoView = {
  public_id?: string
  file_name?: string
  file_size?: number
  width?: number
  height?: number
  expires_at?: string
  signed_url?: string
  active?: boolean
}

type Lead = {
  lead_id: string
  customer_token: string
  created_at: string
  language: Lang
  status: LeadStatus

  // Customer identity and consent. These fields are required before sharing the lead.
  customer_name: string
  customer_phone: string
  customer_email: string
  community_slug: string
  community_or_postal: string
  area: Area
  consent_contact_share: boolean
  consent_real_request: boolean
  customer_consent_at: string
  no_phone_spam_limit: number
  phone_verified: boolean
  phone_verified_at: string
  otp_sent_at: string
  otp_attempts: number
  verification_method: 'demo' | 'sms_otp' | 'manual_follow_up'

  // Fast customer-facing request form.
  request_categories: string[]
  rough_amount: 'one_item' | 'two_three_items' | 'small_pile' | 'half_truck' | 'full_truck_plus' | 'not_sure'
  item_location: 'curbside' | 'driveway_garage' | 'inside_home' | 'apartment_condo' | 'basement' | 'not_sure'
  timing: 'today' | 'tomorrow' | 'this_week' | 'flexible'
  request_description: string
  photos: FileMeta[]

  // Risk and classification fields for future database, backend dispatch, and paid access.
  regular_special_items: string[]
  blocked_or_hazardous_items: string[]
  service_tags: string[]
  risk_flags: string[]
  lead_grade: 'small' | 'standard' | 'large' | 'special_confirmation' | 'rejected'
  dispatch_eligible: boolean
  rejection_reason: string
  required_vehicle_level: number
  required_crew_size: number

  // Future monetization fields. Free beta uses 0 but keeps the eventual paid structure.
  future_lead_access_fee: number
  lead_access_fee: number
  sold_count: number
  max_sold_count: number
  access_mode: 'open' | 'shared' | 'exclusive' | 'sold_out'
  shared_access_prices: number[]
  exclusive_access_fee: number
  current_shared_access_fee: number
  contact_release_mode: 'free_beta' | 'paid_access'
  payment_status: 'free_beta' | 'pending_payment' | 'paid' | 'refunded' | 'credit_issued'
  refund_status: 'none' | 'requested' | 'approved' | 'refunded' | 'credit_issued' | 'rejected'

  dispatch_summary: string
}

type ProviderApplication = {
  application_id: string
  created_at: string

  // Beta status. In production, automatic dispatch should require approved + insurance rules.
  approval_status: ApprovalStatus
  active: boolean
  beta_opt_in: boolean
  verified: boolean
  last_assigned_at: string | null

  // Quick opt-in fields.
  provider_display_name: string
  contact_name: string
  phone: string
  email: string
  business_description: string
  service_areas: Area[]
  services_accepted: string[]
  vehicle_capabilities: string[]
  max_vehicle_level: number
  crew_capacity: 'one' | 'two' | 'three_plus'

  // Structured dispatch preferences.
  accepts_sms_leads: boolean
  accepts_email_leads: boolean
  sms_consent_confirmed: boolean
  preferred_notification: 'sms' | 'email' | 'both'
  daily_lead_limit: number
  available_days: string[]
  available_time_windows: string[]
  accepts_same_day: 'yes' | 'no' | 'depends'
  refund_or_bad_number_policy_seen: boolean

  // Future verification fields. Optional for beta, required before paid/verified dispatch.
  provider_type: 'individual_legal_name' | 'sole_prop_trade_name' | 'corporation' | 'not_sure'
  legal_owner_name: string
  corporation_legal_name: string
  registered_trade_name: string
  business_number_bn: string
  gst_hst_account: string
  city_business_id: string
  alberta_registration_proof: FileMeta | null

  general_liability_status: 'yes' | 'no' | 'pending' | 'not_sure'
  commercial_auto_status: 'yes' | 'business_use_endorsement' | 'personal_auto_only' | 'pending' | 'not_sure'
  insurance_company: string
  policy_number: string
  insurance_expiry: string
  general_liability_proof: FileMeta | null
  commercial_auto_proof: FileMeta | null

  uses_helpers: 'owner_only' | 'helpers_subcontractors' | 'employees' | 'not_sure'
  wcb_status: 'not_applicable_solo' | 'have_wcb' | 'pending' | 'not_sure'
  wcb_proof: FileMeta | null

  special_item_capabilities: string[]
  condo_jobs: 'yes' | 'no' | 'depends_loading_zone'
  legal_operation_confirmed: boolean
  no_illegal_dumping_confirmed: boolean
  independent_provider_confirmed: boolean
  terms_confirmed: boolean
}

type Dispatch = {
  dispatch_id: string
  lead_id: string
  provider_id: string
  provider_name: string
  provider_phone: string
  sent_at: string
  channel: 'sms' | 'email'
  contact_released: boolean
  payment_status: 'free_beta' | 'pending_payment' | 'paid' | 'refunded' | 'credit_issued'
  lead_access_fee: number
  future_lead_access_fee: number
  shared_access_prices?: number[]
  exclusive_access_fee?: number
  sold_count_at_dispatch?: number
  phone_verified?: boolean
  sms_preview: string
}

const copy = {
  en: {
    home: 'Home', request: 'Submit Request', providers: 'For Providers', faq: 'FAQ', admin: 'Admin',
    heroTitle: 'Need junk removed in Calgary?',
    heroSub: 'Submit once. We verify your phone, then up to 3 local junk removal providers may contact you directly. No phone spam. No moving jobs. No app.',
    heroCta: 'Submit a Free Request',
    providerCta: 'Get Local Leads',
  },
  zh: {
    home: '首页', request: '提交需求', providers: '服务商入口', faq: 'FAQ', admin: '后台',
    heroTitle: 'Calgary 有垃圾需要清走？',
    heroSub: '一次提交，先验证电话，再由最多 3 个本地清运服务商直接联系你。不群发，不做搬家，不用 App。',
    heroCta: '免费提交需求',
    providerCta: '获取本地线索',
  },
}

const amountOptions = [
  { id: 'one_item', en: '1 item', zh: '1 件' },
  { id: 'two_three_items', en: '2–3 items', zh: '2–3 件' },
  { id: 'small_pile', en: 'Small pile', zh: '一小堆' },
  { id: 'half_truck', en: 'About half truck', zh: '约半车' },
  { id: 'full_truck_plus', en: 'Full truck+', zh: '一车以上' },
  { id: 'not_sure', en: 'Not sure', zh: '不确定' },
]

const locationOptions = [
  { id: 'curbside', en: 'Curbside', zh: '路边' },
  { id: 'driveway_garage', en: 'Driveway / garage', zh: '车道 / 车库' },
  { id: 'inside_home', en: 'Inside home', zh: '屋内' },
  { id: 'apartment_condo', en: 'Apartment / condo', zh: '公寓 / Condo' },
  { id: 'basement', en: 'Basement', zh: '地下室' },
  { id: 'not_sure', en: 'Not sure', zh: '不确定' },
]

const regularSpecialItems = [
  { id: 'fridge_freezer', en: 'Fridge / freezer', zh: '冰箱 / 冷柜' },
  { id: 'washer_dryer', en: 'Washer / dryer', zh: '洗衣机 / 烘干机' },
  { id: 'tv_electronics', en: 'TV / electronics', zh: '电视 / 电子产品' },
  { id: 'heavy_items', en: 'Heavy items', zh: '重物' },
  { id: 'construction_debris', en: 'Construction debris', zh: '装修垃圾' },
]

const blockedItems = [
  { id: 'paint_chemicals', en: 'Paint / chemicals', zh: '油漆 / 化学品' },
  { id: 'propane_tank', en: 'Propane tank', zh: '煤气罐' },
  { id: 'car_battery', en: 'Car battery', zh: '汽车电池' },
  { id: 'motor_oil', en: 'Motor oil', zh: '机油' },
  { id: 'asbestos_unknown', en: 'Asbestos / unknown hazardous waste', zh: '石棉 / 不明危险废物' },
]

const vehicleOptions = [
  { id: 'small_vehicle', level: 1, en: 'SUV / small vehicle', zh: 'SUV / 小车' },
  { id: 'pickup', level: 2, en: 'Pickup truck', zh: '皮卡' },
  { id: 'cargo_van', level: 2, en: 'Cargo van', zh: '货 Van' },
  { id: 'pickup_trailer', level: 3, en: 'Pickup with trailer', zh: '皮卡 + 拖车' },
  { id: 'box_truck', level: 4, en: 'Box truck', zh: '厢式货车' },
  { id: 'dump_trailer', level: 4, en: 'Dump trailer', zh: '大拖车 / Dump trailer' },
]



type Community = {
  slug: string
  name: string
  area: Area
  noteEn: string
  noteZh: string
  introEn: string
  introZh: string
  localEn: string
  localZh: string
  commonEn: string[]
  commonZh: string[]
  nearby: string[]
}

const communities: Community[] = [
  {
    slug: "beltline",
    name: "Beltline",
    area: "central",
    noteEn: "Dense condos, rentals, parkades, elevators, and short loading windows make Beltline clearouts different from suburban pickup jobs.",
    noteZh: "Beltline 多为高密度公寓、出租房、地下车库、电梯和短时间装卸窗口，和郊区清运不一样。",
    introEn: "Beltline junk removal requests are usually about convenience: old sofas in condo units, mattress pickup before a lease ends, storage-locker clearouts, or small furniture left behind after a downtown move. Clearout YYC lets you submit one Beltline request and, if available, up to 3 independent Calgary-area junk removal providers may contact you directly.",
    introZh: "Beltline 的清运需求通常强调方便：Condo 旧沙发、退租前床垫、储物间杂物，或市中心搬出后留下的小家具。Clearout YYC 让你提交一次 Beltline 需求；如果匹配到本地服务商，最多 3 个独立清运服务商可能直接联系你。",
    localEn: "For Beltline jobs, the most useful details are building access, elevator rules, parking or loading-zone notes, and whether items are in a unit, storage locker, parkade, or alley. Photos help providers decide whether a pickup truck is enough or whether a second person may be needed.",
    localZh: "Beltline 单子最重要的信息是楼宇进入方式、电梯规则、停车/装卸区、物品是在房间、储物间、地下车库还是后巷。照片可以帮助服务商判断皮卡是否足够、是否需要第二个人。",
    commonEn: ["Condo sofa or mattress pickup", "Storage locker cleanout", "Move-out leftovers from rentals", "Small furniture and boxes", "Parkade or loading-zone pickup"],
    commonZh: ["Condo 沙发或床垫清运", "储物间清理", "出租房退租剩余物", "小家具和纸箱", "地下车库或装卸区取件"],
    nearby: ["Downtown", "Mission", "Kensington", "Inglewood"],
  },
  {
    slug: "downtown",
    name: "Downtown Calgary",
    area: "central",
    noteEn: "Downtown Calgary requests often involve towers, office-to-condo buildings, loading docks, time-limited parking, and building instructions.",
    noteZh: "Downtown Calgary 常见高层、商住楼、装卸口、限时停车和楼宇进入说明。",
    introEn: "Downtown Calgary junk removal often comes from apartments, office-adjacent condos, move-out cleanups, and small business spaces that need unwanted items cleared without calling multiple companies. Submit one request and available independent providers can review the details and contact you directly.",
    introZh: "Downtown Calgary 清运需求常来自公寓、商住楼 Condo、退租清理和小型商业空间。你不需要挨个打电话；提交一次需求，符合条件的独立服务商可以查看信息并直接联系你。",
    localEn: "Downtown jobs need clear access notes. Include the building name, loading dock instructions, elevator booking needs, parking limits, and whether the items are in a suite, storage room, or loading area. This helps prevent wasted trips.",
    localZh: "Downtown 单子需要清楚写明进入方式。建议填写楼名、装卸口、电梯预约、停车限制，以及物品在套间、储物室还是装卸区，避免服务商白跑。",
    commonEn: ["Apartment move-out junk", "Office or storage room clearouts", "Mattress and chair removal", "Small appliance pickup", "Boxes and mixed household items"],
    commonZh: ["公寓退租杂物", "办公室或储物间清理", "床垫和椅子清运", "小家电取走", "纸箱和混合生活杂物"],
    nearby: ["Beltline", "Mission", "Bridgeland", "Kensington"],
  },
  {
    slug: "mission",
    name: "Mission",
    area: "central",
    noteEn: "Mission clearouts are often apartment or older-building jobs where stairs, alley access, and limited curb space matter.",
    noteZh: "Mission 清运常见公寓或老楼场景，楼梯、后巷和路边空间会影响服务商判断。",
    introEn: "Mission residents and renters often need help clearing a mattress, couch, old shelving, balcony items, or move-out leftovers from apartments and older buildings. Clearout YYC is a simple request platform: submit the details once, and up to 3 local providers may contact you if your request fits their availability.",
    introZh: "Mission 住户和租客常需要清走床垫、沙发、旧架子、阳台物品或退租剩余物。Clearout YYC 是一个简单的需求平台：你提交一次信息，如果符合服务商范围和时间，最多 3 个本地服务商可能联系你。",
    localEn: "Mission jobs are easier to quote when providers know if there are stairs, elevator restrictions, rear-lane access, or a tight pickup window. Mention whether items can be placed near the entrance or must be removed from inside the unit.",
    localZh: "Mission 单子如果提前说明楼梯、电梯限制、后巷入口或取件时间窗口，会更容易让服务商判断。也要写清楚物品能否放到入口附近，还是必须从室内搬出。",
    commonEn: ["Apartment furniture pickup", "Mattress and bed frame removal", "Balcony or storage cleanout", "Small move-out leftovers", "Boxes, lamps, and shelving"],
    commonZh: ["公寓家具清运", "床垫和床架清走", "阳台或储物空间清理", "小型退租剩余物", "纸箱、台灯和架子"],
    nearby: ["Beltline", "Downtown", "Inglewood", "Marda Loop"],
  },
  {
    slug: "kensington",
    name: "Kensington",
    area: "central",
    noteEn: "Kensington has inner-city apartments, older houses, tight streets, and mixed residential-commercial access.",
    noteZh: "Kensington 有内城公寓、老房子、窄街和商住混合入口，清运前要说明停车和进入方式。",
    introEn: "Kensington junk removal requests often involve a mix of apartment move-outs, old furniture, basement items, and small household cleanouts. Instead of calling around, submit a Kensington request and let available local providers decide whether the job fits their route.",
    introZh: "Kensington 清运需求通常包括公寓退租、旧家具、地下室物品和小型家庭清理。与其挨个电话询价，不如提交一个 Kensington 需求，让可用的本地服务商判断是否顺路。",
    localEn: "Because Kensington has tighter streets and mixed building types, add notes about rear-lane access, stair count, parking, and whether items are already outside. Good photos make the request much easier for providers to assess.",
    localZh: "Kensington 街道较紧、楼型混合，建议写明后巷入口、楼梯层数、停车情况，以及物品是否已经放到室外。清晰照片能显著提高服务商判断效率。",
    commonEn: ["Old couch pickup", "Basement junk piles", "Student or rental move-out items", "Small furniture removal", "Boxes and household clutter"],
    commonZh: ["旧沙发清运", "地下室杂物堆", "学生或出租房退租物品", "小家具清走", "纸箱和生活杂物"],
    nearby: ["Downtown", "Beltline", "Bridgeland", "Mission"],
  },
  {
    slug: "bridgeland",
    name: "Bridgeland",
    area: "central",
    noteEn: "Bridgeland requests can involve condos, infills, older homes, garages, and lane-access pickups near the inner city.",
    noteZh: "Bridgeland 常见 Condo、infill、老房子、车库和内城后巷取件场景。",
    introEn: "Bridgeland clearout requests can range from condo furniture pickup to garage cleanouts, basement clutter, or items left after a renovation. Clearout YYC helps you submit the request once and, if available, independent providers may contact you directly.",
    introZh: "Bridgeland 的清运需求可能是 Condo 家具、车库清理、地下室杂物，或装修后剩下的普通废料。Clearout YYC 帮你提交一次需求；如果有服务商可接，独立服务商可能直接联系你。",
    localEn: "For Bridgeland jobs, tell providers whether there is lane access, a garage, stairs, or a loading area. If renovation debris is included, describe the material clearly so providers can decide whether it fits regular junk removal.",
    localZh: "Bridgeland 单子建议说明是否有后巷、车库、楼梯或装卸区。如果包含装修废料，要写清楚材料类型，让服务商判断是否属于普通清运范围。",
    commonEn: ["Garage and basement cleanouts", "Condo furniture pickup", "Small renovation debris", "Mattress and box spring removal", "Household clutter and boxes"],
    commonZh: ["车库和地下室清理", "Condo 家具取走", "小型装修废料", "床垫和床箱清运", "生活杂物和纸箱"],
    nearby: ["Downtown", "Inglewood", "Kensington", "Beltline"],
  },
  {
    slug: "inglewood",
    name: "Inglewood",
    area: "central",
    noteEn: "Inglewood has older homes, laneways, small businesses, garages, and mixed-use clearout needs.",
    noteZh: "Inglewood 有老房子、后巷、小商铺、车库和商住混合清理需求。",
    introEn: "Inglewood junk removal requests often involve older household items, garage piles, small business clutter, yard debris, or move-out leftovers from established homes. Clearout YYC gives you one local request form instead of repeated calls.",
    introZh: "Inglewood 清运常见老家具、车库杂物、小商铺杂物、庭院废料或成熟住宅退租剩余物。Clearout YYC 提供一个本地需求表单，避免重复打电话。",
    localEn: "Mention whether pickup is from a garage, lane, storefront, yard, basement, or back entrance. If items are heavy or awkward, include photos and note whether someone on-site can help point out the pile.",
    localZh: "请写明取件位置是车库、后巷、店面、庭院、地下室还是后门。如果物品很重或形状不规则，建议上传照片，并说明现场是否有人指引。",
    commonEn: ["Garage junk and old shelving", "Small shop cleanouts", "Yard debris and branches", "Move-out leftovers", "Furniture and appliance pickup"],
    commonZh: ["车库杂物和旧架子", "小商铺清理", "庭院废料和树枝", "退租剩余物", "家具和家电清运"],
    nearby: ["Bridgeland", "Downtown", "Mission", "Beltline"],
  },
  {
    slug: "marda-loop",
    name: "Marda Loop",
    area: "sw",
    noteEn: "Marda Loop clearouts often involve apartments, infills, townhomes, smaller homes, and tighter curb or alley access.",
    noteZh: "Marda Loop 常见公寓、infill、联排、小住宅，以及较紧的路边或后巷取件。",
    introEn: "Marda Loop residents may need old furniture, mattresses, boxes, or renovation leftovers cleared from apartments, infills, or townhomes. Submit one free request and Clearout YYC may share it with up to 3 local providers who choose whether to contact you.",
    introZh: "Marda Loop 住户可能需要清走公寓、infill 或联排里的旧家具、床垫、纸箱或装修剩余物。提交一次免费需求后，Clearout YYC 可能分享给最多 3 个本地服务商，由他们决定是否联系你。",
    localEn: "Access notes matter in Marda Loop. Include parking, stairs, alley access, and whether items are inside the unit or ready outside. This helps providers avoid surprises on tight residential streets.",
    localZh: "Marda Loop 单子非常需要进入说明。请写明停车、楼梯、后巷入口，以及物品在室内还是已经放到室外，避免服务商在窄街临时遇到问题。",
    commonEn: ["Townhouse furniture pickup", "Apartment move-out leftovers", "Renovation debris from small projects", "Mattress removal", "Boxes and household clutter"],
    commonZh: ["联排家具清运", "公寓退租剩余物", "小型项目装修废料", "床垫清运", "纸箱和生活杂物"],
    nearby: ["Altadore", "Mission", "Signal Hill", "Beltline"],
  },
  {
    slug: "altadore",
    name: "Altadore",
    area: "sw",
    noteEn: "Altadore jobs often come from family homes, garages, infills, basements, and renovation cleanups.",
    noteZh: "Altadore 清运常来自家庭住宅、车库、infill、地下室和装修后的普通清理。",
    introEn: "Altadore junk removal requests are often about garage space, basement storage, old furniture, or clearing items after a home project. Clearout YYC helps homeowners and renters submit one request for local provider review.",
    introZh: "Altadore 清运需求常围绕车库空间、地下室储物、旧家具，或家庭项目后的清理。Clearout YYC 帮助房主和租客提交一次需求，供本地服务商查看。",
    localEn: "For Altadore, providers benefit from knowing whether there is driveway access, a rear lane, stairs, or heavy furniture. If the job involves renovation debris, list the materials and approximate pile size.",
    localZh: "Altadore 单子建议说明是否有车道、后巷、楼梯或重家具。如果涉及装修废料，请写明材料类型和大概堆放规模。",
    commonEn: ["Garage cleanouts", "Basement storage items", "Old furniture and mattresses", "Small renovation debris", "Yard cleanup piles"],
    commonZh: ["车库清理", "地下室储物物品", "旧家具和床垫", "小型装修废料", "庭院清理堆放物"],
    nearby: ["Marda Loop", "Signal Hill", "West Springs", "Mission"],
  },
  {
    slug: "aspen-woods",
    name: "Aspen Woods",
    area: "sw",
    noteEn: "Aspen Woods requests may involve larger homes, garages, basement storage, scheduled pickup windows, and heavy furniture.",
    noteZh: "Aspen Woods 常见较大住宅、车库、地下室储物、预约取件窗口和重家具清运。",
    introEn: "Aspen Woods junk removal requests often involve larger household items, garage cleanouts, old furniture, basement storage, or move-out leftovers. Submit a clear request with photos so providers can judge truck size, crew needs, and timing before contacting you.",
    introZh: "Aspen Woods 的清运需求常涉及大件家居、车库清理、旧家具、地下室储物或搬出后剩余物。提交时上传照片，可以帮助服务商判断车辆、人数和时间。",
    localEn: "For larger homes, it helps to separate items by location: garage, basement, main floor, yard, or driveway. Mention if items are heavy, assembled, or need to be carried up or down stairs.",
    localZh: "较大住宅建议按位置说明：车库、地下室、一楼、庭院或车道。请注明是否有重物、组装家具，或需要上下楼搬运。",
    commonEn: ["Large furniture pickup", "Garage and basement cleanouts", "Move-out leftovers", "Mattresses and bed frames", "Old exercise equipment"],
    commonZh: ["大件家具清运", "车库和地下室清理", "搬出后剩余物", "床垫和床架", "旧健身器材"],
    nearby: ["West Springs", "Signal Hill", "Altadore", "Tuscany"],
  },
  {
    slug: "signal-hill",
    name: "Signal Hill",
    area: "sw",
    noteEn: "Signal Hill clearouts often involve established homes, garages, basement storage, old furniture, and larger household items.",
    noteZh: "Signal Hill 多为成熟住宅，常见车库、地下室储物、旧家具和较大生活物品清运。",
    introEn: "Signal Hill residents often need help clearing garages, basements, mattresses, old cabinets, patio items, or furniture that no longer fits. Clearout YYC lets you submit a Signal Hill request and connect with available local providers without calling around.",
    introZh: "Signal Hill 住户常需要清理车库、地下室、床垫、旧柜子、露台物品或不再需要的家具。Clearout YYC 让你提交一个 Signal Hill 需求，不用一家家电话联系。",
    localEn: "Driveway access is often helpful in Signal Hill, but providers still need to know item location, stairs, and pile size. If there are multiple areas of the house to clear, list them separately.",
    localZh: "Signal Hill 很多住宅有车道，这对清运有帮助，但服务商仍需要知道物品位置、楼梯和堆放规模。如果房子多个区域要清理，请分开列出来。",
    commonEn: ["Basement and garage junk", "Old cabinets or shelving", "Patio furniture pickup", "Mattress and sofa removal", "Move-out or downsizing items"],
    commonZh: ["地下室和车库杂物", "旧柜子或架子", "露台家具清运", "床垫和沙发清走", "搬家或缩小住房后的物品"],
    nearby: ["Aspen Woods", "West Springs", "Altadore", "Marda Loop"],
  },
  {
    slug: "west-springs",
    name: "West Springs",
    area: "sw",
    noteEn: "West Springs jobs often involve suburban homes, garages, renovation leftovers, furniture, and scheduled pickup windows.",
    noteZh: "West Springs 常见郊区住宅、车库、装修剩余物、家具以及需要预约时间段的清运需求。",
    introEn: "West Springs clearout requests are often tied to garage cleanups, furniture replacement, basement organization, or small renovation projects. Submit one request and available local providers may contact you with their own pricing and timing.",
    introZh: "West Springs 清运需求常来自车库整理、家具更换、地下室收纳或小型装修项目。你提交一次需求后，可用的本地服务商可能用自己的价格和时间直接联系你。",
    localEn: "Include whether items are in the garage, basement, driveway, or yard. For renovation debris, note whether it is wood, drywall, flooring, cabinets, or mixed material so providers can assess disposal needs.",
    localZh: "请说明物品在车库、地下室、车道还是庭院。若有装修废料，请注明是木料、石膏板、地板、柜体还是混合材料，方便服务商判断处置方式。",
    commonEn: ["Garage cleanout piles", "Furniture and mattress pickup", "Small renovation debris", "Basement storage items", "Yard or patio items"],
    commonZh: ["车库清理堆", "家具和床垫清运", "小型装修废料", "地下室储物物品", "庭院或露台物品"],
    nearby: ["Aspen Woods", "Signal Hill", "Altadore", "Tuscany"],
  },
  {
    slug: "panorama-hills",
    name: "Panorama Hills",
    area: "nw",
    noteEn: "Panorama Hills requests often come from family homes, garages, basement storage, move-outs, mattresses, and old furniture.",
    noteZh: "Panorama Hills 常见家庭住宅、车库、地下室储物、退租、床垫和旧家具清运。",
    introEn: "Panorama Hills is a strong fit for local junk removal requests because many jobs come from garages, basements, family homes, and move-out cleanups. Submit one request and up to 3 independent Calgary-area providers may contact you if the job matches their route and availability.",
    introZh: "Panorama Hills 很适合本地清运需求，因为很多单子来自车库、地下室、家庭住宅和退租清理。提交一次需求后，如果匹配路线和时间，最多 3 个 Calgary 本地独立服务商可能联系你。",
    localEn: "North Calgary providers usually want to know whether items are in the garage, basement, driveway, or upstairs bedroom. Photos of the pile help them decide whether the job is a quick pickup or a larger cleanout.",
    localZh: "北 Calgary 服务商通常需要知道物品在车库、地下室、车道还是楼上卧室。杂物堆照片能帮助他们判断这是快速取件还是较大清理。",
    commonEn: ["Garage junk piles", "Mattress and sofa pickup", "Basement storage clearouts", "Move-out leftovers", "Old appliances and boxes"],
    commonZh: ["车库杂物堆", "床垫和沙发清运", "地下室储物清理", "退租剩余物", "旧家电和纸箱"],
    nearby: ["Evanston", "Sage Hill", "Royal Oak", "Tuscany"],
  },
  {
    slug: "evanston",
    name: "Evanston",
    area: "nw",
    noteEn: "Evanston clearouts often involve newer homes, garages, basement storage, family move-outs, and seasonal clutter.",
    noteZh: "Evanston 常见较新住宅、车库、地下室储物、家庭搬出和季节性杂物清运。",
    introEn: "Evanston junk removal requests commonly involve garage piles, old furniture, broken household items, mattresses, and boxes after a move or seasonal cleanout. Clearout YYC gives you one form to submit the request and route it to available local providers.",
    introZh: "Evanston 清运需求常包括车库杂物、旧家具、坏掉的家居用品、床垫，以及搬家或季节性整理后的纸箱。Clearout YYC 用一个表单帮你提交需求，并可能分发给可用的本地服务商。",
    localEn: "For Evanston jobs, note whether pickup is from the garage, driveway, basement, or upper floor. If access is easy and items are grouped together, providers can usually assess the request faster.",
    localZh: "Evanston 单子建议说明取件位置是车库、车道、地下室还是楼上。如果入口方便、物品已集中堆放，服务商通常更快判断。",
    commonEn: ["Garage and driveway piles", "Old couch or mattress pickup", "Basement clutter", "Move-out boxes", "Seasonal cleanup items"],
    commonZh: ["车库和车道堆放物", "旧沙发或床垫清运", "地下室杂物", "搬家纸箱", "季节性整理物品"],
    nearby: ["Panorama Hills", "Sage Hill", "Royal Oak", "Tuscany"],
  },
  {
    slug: "sage-hill",
    name: "Sage Hill",
    area: "nw",
    noteEn: "Sage Hill has newer homes, condos, townhomes, garages, and many practical furniture or move-out pickup requests.",
    noteZh: "Sage Hill 有较新住宅、Condo、联排和车库，常见家具和退租取件需求。",
    introEn: "Sage Hill requests often come from condos, townhomes, garages, and newer homes where residents need old furniture, boxes, mattresses, or move-out leftovers removed. Submit a Sage Hill request and local providers may contact you directly.",
    introZh: "Sage Hill 需求常来自 Condo、联排、车库和较新住宅，住户需要清走旧家具、纸箱、床垫或退租剩余物。提交 Sage Hill 需求后，本地服务商可能直接联系你。",
    localEn: "Condo and townhome requests should include stairs, elevator access, parkade height limits, and where the items are located. For garage jobs, note whether providers can back up a truck or trailer.",
    localZh: "Condo 和联排需求请说明楼梯、电梯、地下车库限高和物品位置。车库单子请说明服务商是否能倒车靠近，是否可使用拖车。",
    commonEn: ["Condo move-out leftovers", "Townhome furniture pickup", "Garage storage cleanout", "Mattress and bed frame removal", "Boxes and household clutter"],
    commonZh: ["Condo 退租剩余物", "联排家具清运", "车库存储清理", "床垫和床架清运", "纸箱和生活杂物"],
    nearby: ["Evanston", "Panorama Hills", "Royal Oak", "Tuscany"],
  },
  {
    slug: "auburn-bay",
    name: "Auburn Bay",
    area: "se",
    noteEn: "Auburn Bay jobs are often suburban garage, furniture, mattress, yard, and move-out requests in SE Calgary.",
    noteZh: "Auburn Bay 常见东南 Calgary 郊区车库、家具、床垫、庭院和退租清运需求。",
    introEn: "Auburn Bay junk removal requests are often a good match for providers with pickup or trailer capacity. Common jobs include garage clutter, mattresses, old couches, small appliances, and move-out piles from family homes and townhomes.",
    introZh: "Auburn Bay 的清运需求通常适合有皮卡或拖车能力的服务商。常见单子包括车库杂物、床垫、旧沙发、小家电，以及独立屋或联排搬出后的杂物堆。",
    localEn: "For SE suburban pickups, providers need item size, location, and whether the pile is accessible from the garage, driveway, or side yard. Upload photos if the load may be more than one pickup trip.",
    localZh: "东南郊区取件要说明物品大小、位置，以及是否能从车库、车道或侧院接近。如果可能超过一车，建议上传照片。",
    commonEn: ["Garage cleanouts", "Old sofa and mattress pickup", "Small appliance removal", "Move-out leftovers", "Yard and patio items"],
    commonZh: ["车库清理", "旧沙发和床垫清运", "小家电清走", "搬出后剩余物", "庭院和露台物品"],
    nearby: ["Mahogany", "Seton", "McKenzie Towne", "Inglewood"],
  },
  {
    slug: "mahogany",
    name: "Mahogany",
    area: "se",
    noteEn: "Mahogany requests often come from newer homes, garages, basements, move-outs, furniture replacement, and yard cleanup.",
    noteZh: "Mahogany 常见较新住宅、车库、地下室、搬出、家具更换和庭院整理需求。",
    introEn: "Mahogany junk removal requests often involve newer homes with garage storage, basement items, old furniture, mattresses, and move-out leftovers. Clearout YYC helps you submit one request and lets available local providers contact you directly.",
    introZh: "Mahogany 清运需求常涉及较新住宅的车库存储、地下室物品、旧家具、床垫和退租剩余物。Clearout YYC 让你提交一次需求，由可用的本地服务商直接联系你。",
    localEn: "Because Mahogany jobs can involve larger suburban homes, describe the pile size and where the items are located. Note if providers can use the driveway or if items are in a basement or upstairs room.",
    localZh: "Mahogany 单子可能来自较大住宅，请描述堆放规模和物品位置。说明是否可用车道，物品是否在地下室或楼上房间。",
    commonEn: ["Garage storage cleanout", "Basement items", "Mattress and furniture pickup", "Move-out junk", "Patio and yard items"],
    commonZh: ["车库存储清理", "地下室物品", "床垫和家具清运", "退租杂物", "露台和庭院物品"],
    nearby: ["Auburn Bay", "Seton", "McKenzie Towne", "Inglewood"],
  },
  {
    slug: "seton",
    name: "Seton",
    area: "se",
    noteEn: "Seton is a growing SE area with condos, townhomes, newer homes, apartment move-outs, and practical furniture pickup needs.",
    noteZh: "Seton 是东南增长型社区，有 Condo、联排、较新住宅、公寓退租和实用家具清运需求。",
    introEn: "Seton junk removal requests often come from condos, townhomes, and newer homes where residents need old furniture, mattresses, boxes, or move-out leftovers removed. Submit a Seton request to connect with available local providers.",
    introZh: "Seton 清运需求常来自 Condo、联排和较新住宅，住户需要清走旧家具、床垫、纸箱或退租剩余物。提交 Seton 需求后，可能连接到可用的本地服务商。",
    localEn: "Seton requests should mention condo access, parkade limits, elevator needs, garage access, and whether the items are ready for pickup. Clear photos reduce back-and-forth before providers contact you.",
    localZh: "Seton 需求应说明 Condo 入口、地下车库限高、电梯需求、车库入口，以及物品是否已准备好。清晰照片可以减少服务商联系前的来回确认。",
    commonEn: ["Condo furniture pickup", "Townhome move-out leftovers", "Mattress removal", "Garage boxes and clutter", "Small appliance pickup"],
    commonZh: ["Condo 家具清运", "联排退租剩余物", "床垫清运", "车库纸箱和杂物", "小家电清走"],
    nearby: ["Mahogany", "Auburn Bay", "McKenzie Towne", "Inglewood"],
  },
  {
    slug: "mckenzie-towne",
    name: "McKenzie Towne",
    area: "se",
    noteEn: "McKenzie Towne has homes, townhomes, garages, apartments, and mixed household clearout needs.",
    noteZh: "McKenzie Towne 有独立屋、联排、车库、公寓和多种家庭清理需求。",
    introEn: "McKenzie Towne clearouts often involve furniture, mattresses, garage piles, yard waste, and move-out leftovers from a mix of homes, townhomes, and apartments. Clearout YYC lets you submit a local request once instead of calling several providers.",
    introZh: "McKenzie Towne 清运常包括家具、床垫、车库堆积物、庭院废料，以及独立屋、联排和公寓退租剩余物。Clearout YYC 让你一次提交本地需求，不用联系多家。",
    localEn: "Providers can assess McKenzie Towne jobs faster when you specify item location, parking, and whether the load is small, medium, or large. If yard debris is included, note whether it is bagged or loose.",
    localZh: "McKenzie Towne 单子如果说明物品位置、停车情况和清运规模，小/中/大，服务商会更快判断。如果有庭院废料，请注明是否已装袋。",
    commonEn: ["Garage junk removal", "Old furniture pickup", "Yard waste and branches", "Move-out leftovers", "Mattresses and boxes"],
    commonZh: ["车库杂物清运", "旧家具取走", "庭院废料和树枝", "退租剩余物", "床垫和纸箱"],
    nearby: ["Auburn Bay", "Mahogany", "Seton", "Inglewood"],
  },
  {
    slug: "tuscany",
    name: "Tuscany",
    area: "nw",
    noteEn: "Tuscany requests commonly involve established family homes, garages, basements, yard items, and furniture removal.",
    noteZh: "Tuscany 清运常来自成熟家庭住宅、车库、地下室、庭院物品和家具清走。",
    introEn: "Tuscany junk removal requests often come from family homes where garages, basements, and storage areas have collected old furniture, boxes, broken items, or seasonal clutter. Submit a Tuscany request and local providers may contact you directly.",
    introZh: "Tuscany 清运需求常来自家庭住宅，车库、地下室和储物区积累了旧家具、纸箱、坏物品或季节性杂物。提交 Tuscany 需求后，本地服务商可能直接联系你。",
    localEn: "For Tuscany jobs, note whether providers can use the driveway, whether items are in a basement, and whether heavy items require stairs. Grouped items and photos help providers judge the load.",
    localZh: "Tuscany 单子请说明服务商是否能用车道，物品是否在地下室，重物是否需要上下楼。集中堆放和照片有助于判断车次和人工。",
    commonEn: ["Basement storage clearout", "Garage junk piles", "Old furniture and mattresses", "Yard cleanup items", "Downsizing or move-out leftovers"],
    commonZh: ["地下室储物清理", "车库杂物堆", "旧家具和床垫", "庭院整理物品", "缩小住房或搬出剩余物"],
    nearby: ["Royal Oak", "Panorama Hills", "Evanston", "Sage Hill"],
  },
  {
    slug: "royal-oak",
    name: "Royal Oak",
    area: "nw",
    noteEn: "Royal Oak jobs often include garages, basements, old furniture, mattresses, seasonal storage, and family-home clearouts.",
    noteZh: "Royal Oak 常见车库、地下室、旧家具、床垫、季节性储物和家庭住宅清理。",
    introEn: "Royal Oak residents often need practical junk removal for garage piles, basement items, mattresses, old furniture, and move-out leftovers. Clearout YYC helps you submit one request that can be reviewed by local independent providers.",
    introZh: "Royal Oak 住户常有车库堆积、地下室物品、床垫、旧家具和搬出后剩余物的普通清运需求。Clearout YYC 帮你提交一个需求，供本地独立服务商查看。",
    localEn: "Providers need to know whether items are ready in the garage or must be carried from inside the home. Add notes about stairs, driveway access, and pile size, especially for larger household items.",
    localZh: "服务商需要知道物品是否已放在车库，还是必须从室内搬出。请补充楼梯、车道入口和堆放规模，尤其是大件生活物品。",
    commonEn: ["Garage cleanouts", "Basement storage items", "Mattress and sofa pickup", "Seasonal clutter", "Move-out boxes and furniture"],
    commonZh: ["车库清理", "地下室储物物品", "床垫和沙发清运", "季节性杂物", "搬家纸箱和家具"],
    nearby: ["Tuscany", "Panorama Hills", "Evanston", "Sage Hill"],
  },
]

type ServicePageData = {
  slug: string
  categoryIds: string[]
  titleEn: string
  titleZh: string
  h1En: string
  h1Zh: string
  metaEn: string
  metaZh: string
  introEn: string
  introZh: string
  localEn: string
  localZh: string
  commonEn: string[]
  commonZh: string[]
  goodFitEn: string[]
  goodFitZh: string[]
  notForEn: string[]
  notForZh: string[]
  faqEn: Array<[string, string]>
  faqZh: Array<[string, string]>
  relatedCommunities: string[]
}

const servicePages: ServicePageData[] = [
  {
    slug: 'furniture-removal',
    categoryIds: ['sofa_furniture'],
    titleEn: 'Furniture Removal in Calgary | Clearout YYC',
    titleZh: 'Calgary 家具清运 | Clearout YYC',
    h1En: 'Furniture Removal Requests in Calgary',
    h1Zh: 'Calgary 家具清运需求',
    metaEn: 'Submit a Calgary furniture removal request for sofas, tables, shelves, chairs, mattresses, and move-out leftovers. Up to 3 local providers may contact you directly.',
    metaZh: '提交 Calgary 家具清运需求，适合沙发、桌椅、架子、床垫和退租剩余物。最多 3 个本地服务商可能直接联系你。',
    introEn: 'Need an old sofa, table, shelving unit, chairs, or bulky furniture removed in Calgary? Clearout YYC lets you submit one furniture removal request with photos and pickup details, then available independent local providers may contact you directly.',
    introZh: 'Calgary 有旧沙发、桌子、架子、椅子或大件家具要清走？Clearout YYC 让你一次提交家具清运需求，附上照片和取件信息后，可用的本地独立服务商可能直接联系你。',
    localEn: 'Furniture jobs are easier to assess when you note the item count, whether items are upstairs, in a basement, in a condo, or already in a garage/driveway. Include elevator, parking, and loading-zone notes for apartments and condos.',
    localZh: '家具单子最好说明件数、是否在楼上/地下室/Condo/车库或车道。公寓和 Condo 建议写明电梯、停车和装卸区信息。',
    commonEn: ['Sofa and loveseat pickup', 'Tables, chairs, and shelving', 'Bed frames and headboards', 'Condo furniture move-out leftovers', 'Furniture replacement clearouts'],
    commonZh: ['沙发和双人沙发清运', '桌椅和架子', '床架和床头板', 'Condo 退租家具', '家具更换后的清理'],
    goodFitEn: ['Old furniture that no longer needs to stay', 'Bulky household items with clear access notes', 'Furniture that can be photographed before pickup'],
    goodFitZh: ['不再需要的旧家具', '有清楚入口说明的大件生活物品', '可提前拍照的家具清运'],
    notForEn: ['Full-service moving', 'High-value item transport', 'Piano or specialty moving', 'Hazardous materials mixed into the load'],
    notForZh: ['完整搬家服务', '贵重物品运输', '钢琴或特殊搬运', '混入危险物品的清运'],
    faqEn: [
      ['Is Clearout YYC a furniture removal company?', 'No. Clearout YYC is a request platform. Independent local providers contact you directly if they choose to quote the job.'],
      ['Is it free to submit a furniture removal request?', 'Yes. Customer submission is free during beta. Final price and scheduling are arranged directly with the provider.'],
      ['Should I upload photos of the furniture?', 'Yes. Photos help providers judge size, access, truck space, and whether two people may be needed.'],
      ['Will someone definitely contact me?', 'No. Provider contact depends on availability, distance, timing, and job details.'],
    ],
    faqZh: [
      ['Clearout YYC 是家具清运公司吗？', '不是。Clearout YYC 是需求平台；独立本地服务商如果愿意报价，会直接联系你。'],
      ['提交家具清运需求免费吗？', 'Beta 阶段客户提交免费。最终价格和时间由你和服务商直接确认。'],
      ['需要上传家具照片吗？', '建议上传。照片能帮助服务商判断尺寸、入口、车位空间和是否需要两个人。'],
      ['是否保证一定有人联系？', '不保证。是否联系取决于服务商可用性、距离、时间和需求细节。'],
    ],
    relatedCommunities: ['beltline', 'mission', 'panorama-hills', 'auburn-bay'],
  },
  {
    slug: 'garage-cleanout',
    categoryIds: ['garage_basement'],
    titleEn: 'Garage Cleanout in Calgary | Clearout YYC',
    titleZh: 'Calgary 车库清理 | Clearout YYC',
    h1En: 'Garage Cleanout Requests in Calgary',
    h1Zh: 'Calgary 车库清理需求',
    metaEn: 'Submit a Calgary garage cleanout request for boxes, tools, old furniture, seasonal clutter, and mixed household junk. Up to 3 local providers may contact you.',
    metaZh: '提交 Calgary 车库清理需求，适合纸箱、工具、旧家具、季节性杂物和普通家庭垃圾。最多 3 个本地服务商可能联系你。',
    introEn: 'Garage cleanouts are one of the most common Calgary junk removal needs: old boxes, broken shelves, worn furniture, sports gear, renovation leftovers, and seasonal items that have piled up over time. Submit one request and let available providers review the load.',
    introZh: '车库清理是 Calgary 最常见的清运需求之一：旧纸箱、坏架子、旧家具、运动用品、装修剩余物和多年积累的季节性杂物。提交一次需求，让可用服务商判断能否承接。',
    localEn: 'For garage jobs, say whether providers can back into the driveway, whether the pile is already sorted, and whether anything heavy or sharp is included. Photos from two angles are usually enough for a first estimate.',
    localZh: '车库单子请说明服务商是否能倒车到车道，杂物是否已分类，是否有重物或尖锐物品。从两个角度拍照通常足够服务商初步判断。',
    commonEn: ['Boxes and storage clutter', 'Old shelving and cabinets', 'Broken chairs and small furniture', 'Seasonal and patio items', 'Garage move-out piles'],
    commonZh: ['纸箱和储物杂物', '旧架子和柜子', '坏椅子和小家具', '季节性和露台物品', '车库搬出杂物堆'],
    goodFitEn: ['Household garage clutter', 'Items accessible from driveway or garage door', 'Mixed junk that can be described with photos'],
    goodFitZh: ['普通家庭车库杂物', '可从车道或车库门接近的物品', '能用照片说明的混合杂物'],
    notForEn: ['Paint and chemicals', 'Propane tanks', 'Motor oil and car batteries', 'Unknown hazardous waste'],
    notForZh: ['油漆和化学品', '煤气罐', '机油和汽车电池', '不明危险废物'],
    faqEn: [
      ['Can I submit a messy garage photo?', 'Yes. A clear photo is often better than a long written list.'],
      ['Can providers remove everything in the garage?', 'Only ordinary junk removal items. Hazardous or restricted items are not auto-dispatched.'],
      ['Do I need to sort everything first?', 'Sorting helps, but you can still submit photos and notes so providers can decide whether the job fits.'],
      ['Is a garage cleanout priced by Clearout YYC?', 'No. Providers confirm final price directly with you.'],
    ],
    faqZh: [
      ['车库很乱也能发照片吗？', '可以。清晰照片通常比长文字清单更有用。'],
      ['服务商会把车库所有东西都清走吗？', '只适用于普通清运物品。危险或受限物品不会自动分发。'],
      ['必须先分类吗？', '分类会有帮助，但你也可以先上传照片和说明，让服务商判断是否适合。'],
      ['Clearout YYC 会给车库清理定价吗？', '不会。最终价格由服务商直接和你确认。'],
    ],
    relatedCommunities: ['tuscany', 'royal-oak', 'evanston', 'mahogany'],
  },
  {
    slug: 'move-out-cleanout',
    categoryIds: ['move_out_leftovers'],
    titleEn: 'Move-Out Cleanout in Calgary | Clearout YYC',
    titleZh: 'Calgary 退租清屋 | Clearout YYC',
    h1En: 'Move-Out Cleanout Requests in Calgary',
    h1Zh: 'Calgary 退租清屋需求',
    metaEn: 'Submit a Calgary move-out cleanout request for leftover furniture, boxes, mattresses, and rental clearout items. Up to 3 local providers may contact you.',
    metaZh: '提交 Calgary 退租清屋需求，适合剩余家具、纸箱、床垫和出租房清理物品。最多 3 个本地服务商可能联系你。',
    introEn: 'Moving out of a Calgary rental, condo, townhouse, or family home often leaves a few items that are too large or inconvenient to handle yourself. Clearout YYC helps you submit one move-out cleanout request with timing, access, and photos.',
    introZh: '从 Calgary 的出租房、Condo、联排或独立屋搬出时，经常会剩下一些自己不好处理的大件或杂物。Clearout YYC 帮你一次提交退租清屋需求，包括时间、入口和照片。',
    localEn: 'Move-out jobs often depend on deadlines. Include your handover date, elevator booking rules, loading zone, parking, and whether items must be removed from inside the unit or are already near the exit.',
    localZh: '退租清屋通常受截止日期影响。请说明交房日期、电梯预约规则、装卸区、停车，以及物品是在室内还是已经靠近出口。',
    commonEn: ['Rental move-out leftovers', 'Mattresses and bed frames', 'Small furniture and boxes', 'Condo storage locker cleanouts', 'Landlord or tenant clearouts'],
    commonZh: ['出租房退租剩余物', '床垫和床架', '小家具和纸箱', 'Condo 储物间清理', '房东或租客清屋'],
    goodFitEn: ['Deadline-based clearouts', 'Items left after a move', 'Apartment, condo, townhouse, and house clearouts'],
    goodFitZh: ['有截止日期的清屋', '搬家后剩余物', '公寓、Condo、联排和独立屋清理'],
    notForEn: ['Full moving service', 'Packing and transport to a new home', 'High-value item transport', 'Tenant-landlord dispute handling'],
    notForZh: ['完整搬家服务', '打包并运输到新住所', '贵重物品运输', '房东租客纠纷处理'],
    faqEn: [
      ['Is this a moving service?', 'No. Clearout YYC is for junk removal and clearout requests, not full moving.'],
      ['Can landlords submit a request?', 'Yes, if the request is for junk/leftover item removal and you have authority to arrange removal.'],
      ['Can I submit a same-week move-out request?', 'Yes. Include your timing clearly. Provider availability is not guaranteed.'],
      ['Who handles payment?', 'You and the provider arrange payment directly. Clearout YYC does not collect customer payment for the job.'],
    ],
    faqZh: [
      ['这是搬家公司服务吗？', '不是。Clearout YYC 只做垃圾清运/清屋需求，不做完整搬家。'],
      ['房东可以提交吗？', '可以，只要是剩余物/垃圾清运需求，并且你有权安排清理。'],
      ['本周就要退租可以提交吗？', '可以。请清楚写明时间，但不保证一定有服务商可接。'],
      ['付款怎么处理？', '你和服务商直接确认付款。Clearout YYC 不收客户的清运服务费。'],
    ],
    relatedCommunities: ['beltline', 'downtown', 'mission', 'seton'],
  },
  {
    slug: 'estate-cleanout',
    categoryIds: ['garage_basement', 'sofa_furniture'],
    titleEn: 'Estate Cleanout Requests in Calgary | Clearout YYC',
    titleZh: 'Calgary Estate Cleanout 清屋需求 | Clearout YYC',
    h1En: 'Estate Cleanout Requests in Calgary',
    h1Zh: 'Calgary Estate Cleanout 清屋需求',
    metaEn: 'Submit a Calgary estate cleanout request for household furniture, boxes, garage items, basement storage, and larger clearout projects. Providers contact you directly.',
    metaZh: '提交 Calgary estate cleanout 清屋需求，适合家庭家具、纸箱、车库物品、地下室储物和较大清理项目。服务商直接联系你。',
    introEn: 'Estate cleanouts can involve larger household loads: furniture, basement storage, garage items, boxes, small appliances, and years of accumulated belongings. Clearout YYC lets you submit the request details once so local providers can decide whether the job fits.',
    introZh: 'Estate cleanout 可能涉及较大的家庭清理量：家具、地下室储物、车库物品、纸箱、小家电和多年积累的物品。Clearout YYC 让你一次提交细节，由本地服务商判断是否适合承接。',
    localEn: 'For larger cleanouts, photos and access notes matter. Mention whether the job is one room, basement, garage, full house, or multiple areas, and whether providers need to handle stairs, heavy furniture, or timed access.',
    localZh: '较大清屋项目非常依赖照片和入口说明。请说明是一间房、地下室、车库、整屋还是多个区域，以及是否有楼梯、重家具或限时进入。',
    commonEn: ['Household furniture clearout', 'Basement and garage storage', 'Boxes and mixed household items', 'Downsizing cleanouts', 'Larger family-home clearouts'],
    commonZh: ['家庭家具清屋', '地下室和车库存储', '纸箱和混合生活物品', '缩小住房清理', '较大家庭住宅清屋'],
    goodFitEn: ['Larger ordinary household clearouts', 'Clear photos and access details', 'Jobs where providers can quote directly'],
    goodFitZh: ['较大的普通家庭清屋', '有清楚照片和入口信息', '服务商可直接报价的需求'],
    notForEn: ['Hazardous waste', 'Legal estate administration', 'Appraisal or high-value item handling', 'Biohazard or unsafe property cleanup'],
    notForZh: ['危险废物', '遗产法律事务处理', '估价或贵重物品处理', '生物危害或不安全房屋清理'],
    faqEn: [
      ['Does Clearout YYC manage estate cleanouts?', 'No. We only distribute the request to independent providers. You choose and arrange service directly.'],
      ['Should I describe the size of the property?', 'Yes. Explain which rooms or areas need clearing and upload photos if available.'],
      ['Can this include valuable items?', 'Clearout YYC is not for high-value item transport or appraisal. Discuss anything sensitive directly with a qualified provider.'],
      ['Can a large cleanout still be submitted?', 'Yes, but provider response depends on vehicle capacity, crew size, access, and timing.'],
    ],
    faqZh: [
      ['Clearout YYC 会管理 estate cleanout 吗？', '不会。我们只分发需求给独立服务商。你自行选择并直接安排服务。'],
      ['需要描述房屋规模吗？', '需要。请说明哪些房间或区域需要清理，并尽量上传照片。'],
      ['可以包含贵重物品吗？', 'Clearout YYC 不做贵重物品运输或估价。敏感物品应直接和合格服务商讨论。'],
      ['大清屋也能提交吗？', '可以，但是否有服务商响应取决于车辆、人员、入口和时间。'],
    ],
    relatedCommunities: ['altadore', 'aspen-woods', 'signal-hill', 'royal-oak'],
  },
  {
    slug: 'appliance-removal',
    categoryIds: ['appliances_electronics'],
    titleEn: 'Appliance Removal in Calgary | Clearout YYC',
    titleZh: 'Calgary 家电清运 | Clearout YYC',
    h1En: 'Appliance Removal Requests in Calgary',
    h1Zh: 'Calgary 家电清运需求',
    metaEn: 'Submit a Calgary appliance removal request for fridges, washers, dryers, small appliances, and electronics. Independent local providers may contact you.',
    metaZh: '提交 Calgary 家电清运需求，适合冰箱、洗衣机、烘干机、小家电和电子废料。独立本地服务商可能联系你。',
    introEn: 'Old appliances are heavy, awkward, and often need clear access notes. Use Clearout YYC to submit one appliance removal request for items like fridges, freezers, washers, dryers, small appliances, or electronics.',
    introZh: '旧家电通常很重、不好搬，也需要清楚说明入口。你可以通过 Clearout YYC 提交家电清运需求，例如冰箱、冷柜、洗衣机、烘干机、小家电或电子废料。',
    localEn: 'Appliance requests should mention stairs, basement location, tight doorways, water/gas disconnection status, and whether the item is already outside. Providers need this to judge labour and safety.',
    localZh: '家电单子请说明楼梯、是否在地下室、门口是否狭窄、水/燃气是否已断开，以及物品是否已经放到室外。服务商需要这些信息判断人工和安全。',
    commonEn: ['Fridge or freezer removal', 'Washer and dryer pickup', 'Small appliance cleanout', 'Electronics and TV pickup', 'Appliance replacement leftovers'],
    commonZh: ['冰箱或冷柜清运', '洗衣机和烘干机取走', '小家电清理', '电子产品和电视取走', '家电更换后的旧物'],
    goodFitEn: ['Disconnected household appliances', 'Heavy items with clear access details', 'Appliance replacement cleanup'],
    goodFitZh: ['已断开的家庭家电', '有清楚入口说明的重物', '家电更换后的清理'],
    notForEn: ['Gas disconnection work', 'Hazardous fluids or chemicals', 'Industrial equipment', 'Items requiring licensed trade work before removal'],
    notForZh: ['燃气断开施工', '危险液体或化学品', '工业设备', '搬走前需要持牌工种处理的物品'],
    faqEn: [
      ['Can I submit a fridge removal request?', 'Yes. Include where it is located and whether it is disconnected and accessible.'],
      ['Do providers disconnect appliances?', 'Clearout YYC does not control provider scope. State whether the appliance is already disconnected so providers can respond appropriately.'],
      ['Are electronics accepted?', 'You can submit electronics as part of a request, but final acceptance is up to the provider.'],
      ['Is appliance pickup guaranteed?', 'No. Provider contact and acceptance are not guaranteed.'],
    ],
    faqZh: [
      ['可以提交冰箱清运吗？', '可以。请说明位置、是否已断开以及是否容易接近。'],
      ['服务商会帮忙断开家电吗？', 'Clearout YYC 不控制服务商范围。请说明家电是否已经断开，让服务商自行判断。'],
      ['电子产品可以提交吗？', '可以作为需求提交，但最终是否接受由服务商决定。'],
      ['家电取走有保证吗？', '不保证。是否联系和是否接单由服务商决定。'],
    ],
    relatedCommunities: ['panorama-hills', 'sage-hill', 'auburn-bay', 'mahogany'],
  },
  {
    slug: 'renovation-debris-removal',
    categoryIds: ['renovation_debris'],
    titleEn: 'Renovation Debris Removal in Calgary | Clearout YYC',
    titleZh: 'Calgary 装修尾料清运 | Clearout YYC',
    h1En: 'Renovation Debris Removal Requests in Calgary',
    h1Zh: 'Calgary 装修尾料清运需求',
    metaEn: 'Submit a Calgary renovation debris removal request for ordinary renovation leftovers, wood, cabinets, fixtures, tiles, and bagged debris. Hazardous materials are not accepted.',
    metaZh: '提交 Calgary 装修尾料清运需求，适合普通装修剩余物、木料、柜体、旧配件、瓷砖和袋装废料。不适合危险材料。',
    introEn: 'Small renovation projects can leave wood, cabinets, fixtures, tiles, drywall pieces, packaging, and bagged debris that need to be cleared. Clearout YYC helps you submit one renovation debris request so local providers can judge the load.',
    introZh: '小型装修项目常会留下木料、柜体、旧配件、瓷砖、石膏板碎片、包装和袋装废料。Clearout YYC 帮你一次提交装修尾料需求，让本地服务商判断清运量。',
    localEn: 'Renovation debris requests need careful notes: material type, bagged or loose, sharp edges, weight, pile location, and whether anything may be hazardous. If paint, chemicals, asbestos, or unknown materials are involved, do not submit it as a regular junk request.',
    localZh: '装修尾料需求需要更清楚的信息：材料类型、是否装袋、是否有尖锐边缘、重量、堆放位置，以及是否可能危险。如果涉及油漆、化学品、石棉或不明材料，不要作为普通清运需求提交。',
    commonEn: ['Wood and trim leftovers', 'Cabinets and fixtures', 'Tile and flooring debris', 'Bagged renovation waste', 'Small DIY project cleanup'],
    commonZh: ['木料和线条剩余物', '柜体和旧配件', '瓷砖和地板废料', '袋装装修废料', '小型 DIY 项目清理'],
    goodFitEn: ['Ordinary non-hazardous renovation debris', 'Bagged or clearly piled materials', 'Photos that show material type and volume'],
    goodFitZh: ['普通非危险装修尾料', '已装袋或清楚堆放的材料', '能展示材料类型和体积的照片'],
    notForEn: ['Paint and chemicals', 'Asbestos or suspected asbestos', 'Large demolition projects', 'Concrete/asphalt without provider confirmation'],
    notForZh: ['油漆和化学品', '石棉或疑似石棉', '大型拆除项目', '未与服务商确认的混凝土/沥青'],
    faqEn: [
      ['Can I submit renovation debris?', 'Yes, if it is ordinary non-hazardous debris and you describe the material clearly.'],
      ['Are paint or chemicals allowed?', 'No. Paint, chemicals, and other hazardous materials are not auto-dispatched as regular junk leads.'],
      ['Should debris be bagged?', 'If possible, yes. Bagging or grouping debris helps providers assess labour and truck capacity.'],
      ['Will providers accept heavy material?', 'That depends on the provider. Include material type, weight estimate, and photos.'],
    ],
    faqZh: [
      ['可以提交装修尾料吗？', '可以，但必须是普通非危险尾料，并清楚说明材料。'],
      ['油漆或化学品可以吗？', '不可以。油漆、化学品和其他危险物品不会作为普通清运单自动分发。'],
      ['废料需要装袋吗？', '建议尽量装袋或集中堆放，方便服务商判断人工和车位。'],
      ['服务商会接很重的材料吗？', '取决于服务商。请写明材料类型、估计重量并上传照片。'],
    ],
    relatedCommunities: ['marda-loop', 'altadore', 'west-springs', 'inglewood'],
  },
]

function communityUrl(slug: string) { return `/junk-removal-${slug}-calgary` }
function legacyCommunityUrl(slug: string) { return `/junk-removal-${slug}` }
function serviceUrl(slug: string) { return `/${slug}-calgary` }
function requestUrlForCommunity(slug: string) { return `/request?community=${slug}` }
function requestUrlForService(slug: string) { return `/request?service=${slug}` }
function getCommunityBySlug(slug: string | null | undefined) { return communities.find(c => c.slug === slug) || null }
function getServiceBySlug(slug: string | null | undefined) { return servicePages.find(s => s.slug === slug) || null }
function areaName(area: Area, lang: Lang) { return optionLabel([...providerAreaOptions, { id: 'unknown', en: 'Calgary', zh: 'Calgary' }], area, lang) }

function cn(...v: Array<string | false | null | undefined>) { return v.filter(Boolean).join(' ') }
function uid(prefix: string) { return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}` }
function getList<T>(key: string): T[] { try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] } }
function setList<T>(key: string, rows: T[]) { localStorage.setItem(key, JSON.stringify(rows)) }
function saveList<T>(key: string, row: T) { const old = getList<T>(key); setList(key, [row, ...old].slice(0, 500)) }
function toggleValue(list: string[], value: string) { return list.includes(value) ? list.filter(x => x !== value) : [...list, value] }
function optionLabel(options: ReadonlyArray<{id: string; en: string; zh: string}>, id: string, lang: Lang) { return options.find(o => o.id === id)?.[lang] || id }

function fileMeta(file?: File | null): FileMeta | null { return file ? { file_name: file.name, file_size: file.size, file_type: file.type || 'unknown', uploaded_at: new Date().toISOString(), review_status: 'uploaded' } : null }

function dataUrlByteSize(dataUrl: string) {
  const base64 = String(dataUrl || '').split(',')[1] || ''
  return Math.floor(base64.length * 0.75)
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read image file.'))
    reader.readAsDataURL(file)
  })
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load image file.'))
    img.src = dataUrl
  })
}

async function compressLeadPhoto(file: File, sortOrder: number): Promise<PreparedLeadPhoto> {
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) throw new Error('Only JPG, PNG, and WebP images are allowed.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Original photo must be 5 MB or smaller.')

  const rawUrl = await readFileAsDataUrl(file)
  const image = await loadImageFromDataUrl(rawUrl)

  const maxSide = 1400
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height))
  const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale))
  const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser could not prepare the photo.')
  ctx.drawImage(image, 0, 0, width, height)

  let dataUrl = ''
  for (const quality of [0.82, 0.74, 0.66, 0.58, 0.5]) {
    dataUrl = canvas.toDataURL('image/jpeg', quality)
    if (dataUrlByteSize(dataUrl) <= 700 * 1024) break
  }

  const fileSize = dataUrlByteSize(dataUrl)
  if (fileSize > 1024 * 1024) throw new Error('Compressed photo is still too large. Please choose a smaller image.')

  return {
    file_name: file.name || `photo-${sortOrder + 1}.jpg`,
    mime_type: 'image/jpeg',
    data_url: dataUrl,
    file_size: fileSize,
    width,
    height,
    sort_order: sortOrder,
    preview_url: dataUrl,
    original_size: file.size,
  }
}

async function prepareLeadPhotoUploads(files: FileList | null): Promise<PreparedLeadPhoto[]> {
  const selected = Array.from(files || []).slice(0, 2)
  const prepared: PreparedLeadPhoto[] = []
  for (let i = 0; i < selected.length; i++) {
    prepared.push(await compressLeadPhoto(selected[i], i))
  }
  return prepared
}

function formatBytes(value?: number) {
  const n = Number(value || 0)
  if (!n) return '0 KB'
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(n / 1024))} KB`
}


function normalizeNorthAmericanPhone(input: string): string | null {
  const raw = String(input || '').trim()
  let digits = raw.replace(/\D/g, '')

  // +1 is fixed in the UI. Users type the 10 local digits only.
  // If someone pastes a +1 number, normalize it safely.
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1)
  }

  if (digits.length !== 10) return null

  // NANP rule: area code and exchange cannot start with 0 or 1.
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null

  // Reject obvious fake numbers.
  if (/^(\d)\1{9}$/.test(digits)) return null

  return `+1${digits}`
}

function normalizeEmail(input: string): string | null {
  const email = String(input || '').trim().toLowerCase()

  if (!email) return null
  if (email.length > 254) return null
  if (email.includes('..')) return null

  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(email)) {
    return null
  }

  const [local, domain] = email.split('@')
  if (!local || !domain) return null
  if (local.length > 64) return null
  if (domain.length > 253) return null
  if (domain.startsWith('-') || domain.endsWith('-')) return null
  if (domain.split('.').some(part => !part || part.startsWith('-') || part.endsWith('-'))) return null

  return email
}

function normalizeOptionalEmail(input: string): string | null {
  const raw = String(input || '').trim()
  if (!raw) return ''
  return normalizeEmail(raw)
}

function formatLocalPhoneInput(input: string): string {
  let digits = String(input || '').replace(/\D/g, '')

  // If someone pastes +1 or a leading 1, remove it from the editable field.
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1)
  }

  digits = digits.slice(0, 10)

  if (digits.length > 6) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length > 3) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return digits
}

const USE_REMOTE_API = String(import.meta.env.VITE_USE_REMOTE_API || '').toLowerCase() === 'true'
const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

function isRemoteApiEnabled() { return USE_REMOTE_API }

async function postRemoteJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const text = await response.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { data = { error: text } }
  if (!response.ok) throw new Error(data?.error || `Request failed with status ${response.status}`)
  return data as T
}

type ManualCaptchaChallenge = {
  question: string
  nonce: string
  expires: number
  signature: string
}

type ManualCaptchaState = {
  challenge: ManualCaptchaChallenge | null
  answer: string
  setAnswer: (v: string) => void
  refresh: () => Promise<void>
  loading: boolean
}

async function loadManualCaptchaChallenge(): Promise<ManualCaptchaChallenge> {
  const response = await fetch(`${API_BASE_URL}/api/manual-captcha`, {
    method: 'GET',
    cache: 'no-store',
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error || 'Could not load verification code.')
  return data as ManualCaptchaChallenge
}

function useManualCaptcha(): ManualCaptchaState {
  const [challenge, setChallenge] = useState<ManualCaptchaChallenge | null>(null)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const next = await loadManualCaptchaChallenge()
      setChallenge(next)
      setAnswer('')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh().catch(() => {})
  }, [])

  return { challenge, answer, setAnswer, refresh, loading }
}

function manualCaptchaPayload(state: ManualCaptchaState) {
  return {
    answer: state.answer,
    nonce: state.challenge?.nonce || '',
    expires: state.challenge?.expires || 0,
    signature: state.challenge?.signature || '',
  }
}

function isManualCaptchaReady(state: ManualCaptchaState) {
  return Boolean(state.challenge && state.answer.trim())
}

function ManualCaptchaBox({ lang, captcha }: { lang: Lang; captcha: ManualCaptchaState }) {
  return <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <b className="text-sm text-slate-950">{lang === 'zh' ? '人工验证码' : 'Manual verification'}</b>
        <p className="mt-1 text-xs leading-5 text-slate-500">{lang === 'zh' ? '提交前请输入下面算式的答案，防止恶意提交。' : 'Enter the answer before submitting to reduce spam.'}</p>
      </div>
      <button type="button" onClick={() => captcha.refresh()} className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-black/10 hover:bg-red-50" disabled={captcha.loading}>
        {captcha.loading ? (lang === 'zh' ? '刷新中…' : 'Refreshing…') : (lang === 'zh' ? '换一个' : 'Refresh')}
      </button>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-[140px_1fr]">
      <div className="flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-lg font-bold text-slate-950 ring-1 ring-black/10">
        {captcha.challenge?.question || '...'}
      </div>
      <input
        inputMode="numeric"
        value={captcha.answer}
        onChange={e => captcha.setAnswer(e.target.value.replace(/\D/g, '').slice(0, 3))}
        placeholder={lang === 'zh' ? '输入答案' : 'Enter answer'}
        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-700/10"
      />
    </div>
  </div>
}


function getRoute(): Route {
  const p = window.location.pathname
  if (p === '/request') return { type: 'request' }
  if (p === '/providers' || p === '/providers/join') return { type: 'providerJoin' }
  if (p === '/provider/lead') return { type: 'providerLead' }
  if (p === '/provider/leads' || p === '/providers/leads') return { type: 'providerLeads' }
  if (p === '/admin') return { type: 'admin' }
  if (p === '/faq') return { type: 'faq' }
  if (p === '/areas') return { type: 'areas' }
  const service = servicePages.find(s => serviceUrl(s.slug) === p)
  if (service) return { type: 'service', slug: service.slug }
  const community = communities.find(c => communityUrl(c.slug) === p || legacyCommunityUrl(c.slug) === p)
  if (community) return { type: 'community', slug: community.slug }
  if (p === '/privacy') return { type: 'privacy' }
  if (p === '/terms') return { type: 'terms' }
  return { type: 'home' }
}
function go(path: string) { window.history.pushState({}, '', path); window.dispatchEvent(new Event('popstate')); window.scrollTo({ top: 0, behavior: 'smooth' }) }

function classifyLead(input: {
  categories: string[]
  amount: Lead['rough_amount']
  timing: Lead['timing']
  location: Lead['item_location']
  regular: string[]
  blocked: string[]
}) {
  const riskFlags: string[] = []
  if (input.blocked.length) riskFlags.push('blocked_or_hazardous_items')
  if (input.location === 'inside_home' || input.location === 'apartment_condo' || input.location === 'basement') riskFlags.push('indoor_or_building_access')
  if (input.timing === 'today' || input.timing === 'tomorrow') riskFlags.push('urgent')
  if (input.regular.includes('construction_debris') || input.categories.includes('renovation_debris')) riskFlags.push('special_disposal_confirmation')
  if (input.regular.includes('heavy_items') || input.amount === 'full_truck_plus') riskFlags.push('heavy_or_large_load')

  if (input.blocked.length) {
    return { grade: 'rejected' as const, eligible: false, fee: 0, vehicle: 0, crew: 0, riskFlags, reason: 'blocked_or_hazardous_items' }
  }

  let grade: Lead['lead_grade'] = 'small'
  let futureFee = 5
  let vehicleLevel = 1
  let crew = 1

  if (input.amount === 'two_three_items' || input.amount === 'small_pile') { grade = 'standard'; futureFee = 8; vehicleLevel = 2; crew = 1 }
  if (input.amount === 'half_truck' || input.categories.includes('garage_basement')) { grade = 'large'; futureFee = 12; vehicleLevel = 3; crew = 2 }
  if (input.amount === 'full_truck_plus') { grade = 'large'; futureFee = 15; vehicleLevel = 4; crew = 2 }
  if (input.regular.length || input.categories.includes('renovation_debris')) { grade = 'special_confirmation'; futureFee = Math.max(futureFee, 15); vehicleLevel = Math.max(vehicleLevel, 3); crew = Math.max(crew, 2) }
  if (input.timing === 'today' || input.timing === 'tomorrow') futureFee += 3
  if (input.location === 'apartment_condo' || input.location === 'basement') crew = Math.max(crew, 2)

  return { grade, eligible: true, fee: futureFee, vehicle: vehicleLevel, crew, riskFlags, reason: '' }
}


function getLeadPricing(grade: Lead['lead_grade'], urgent: boolean) {
  if (grade === 'rejected') return { shared: [0, 0, 0], exclusive: 0 }
  if (grade === 'small') return { shared: urgent ? [10, 7, 5] : [8, 5, 5], exclusive: urgent ? 22 : 18 }
  if (grade === 'standard') return { shared: urgent ? [15, 10, 6] : [12, 8, 5], exclusive: urgent ? 36 : 30 }
  return { shared: urgent ? [22, 15, 10] : [18, 12, 8], exclusive: urgent ? 60 : 45 }
}

function buildLeadSummary(lead: Lead, lang: Lang) {
  const cats = lead.request_categories.map(x => optionLabel(requestCategories, x, lang)).join(', ') || (lang === 'zh' ? '未选择' : 'not selected')
  const regular = lead.regular_special_items.map(x => optionLabel(regularSpecialItems, x, lang)).join(', ') || (lang === 'zh' ? '无' : 'none')
  const blocked = lead.blocked_or_hazardous_items.map(x => optionLabel(blockedItems, x, lang)).join(', ') || (lang === 'zh' ? '无' : 'none')
  if (lang === 'zh') return `待电话确认清运需求：${lead.community_or_postal}。类别：${cats}。规模：${optionLabel(amountOptions, lead.rough_amount, lang)}。位置：${optionLabel(locationOptions, lead.item_location, lang)}。时间：${lead.timing}。特殊物品：${regular}。拦截/危险物品：${blocked}。描述：${lead.request_description || '无'}`
  return `Junk removal request pending phone confirmation in ${lead.community_or_postal}. Categories: ${cats}. Size: ${optionLabel(amountOptions, lead.rough_amount, lang)}. Location: ${optionLabel(locationOptions, lead.item_location, lang)}. Timing: ${lead.timing}. Special items: ${regular}. Blocked/hazardous items: ${blocked}. Description: ${lead.request_description || 'none'}`
}


function upsertMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(path: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', `https://clearout.aurorasitesolutions.com${path}`)
}

function upsertMetaProperty(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertJsonLd(id: string, data: unknown) {
  let el = document.getElementById(id) as HTMLScriptElement | null
  if (!el) {
    el = document.createElement('script')
    el.id = id
    el.type = 'application/ld+json'
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

function removeJsonLd(id: string) {
  const el = document.getElementById(id)
  if (el) el.remove()
}

function faqRowsForRoute(route: Route, lang: Lang): Array<[string, string]> {
  if (route.type === 'service') {
    const service = getServiceBySlug(route.slug)
    if (service) return lang === 'zh' ? service.faqZh : service.faqEn
  }
  if (route.type === 'community') {
    const c = getCommunityBySlug(route.slug)
    if (c) return lang === 'zh'
      ? [
          ['Clearout YYC 是清运公司吗？', '不是。Clearout YYC 是普通清运需求分发平台，不直接上门清运。'],
          [`提交 ${c.name} 需求收费吗？`, '客户提交需求免费。最终价格、时间、付款和服务由你和服务商直接确认。'],
          ['是否保证一定有服务商联系？', '不保证。是否联系取决于服务商可用性、距离、需求类型和时间。'],
          ['我应该上传照片吗？', '建议上传。照片能帮助服务商判断车次、人工和是否适合承接。'],
        ]
      : [
          ['Is Clearout YYC a junk removal company?', 'No. Clearout YYC is a request platform. We do not perform junk removal directly.'],
          [`Is it free to submit a ${c.name} request?`, 'Yes. Customer submission is free. Final price, timing, payment, and service details are arranged directly with the provider.'],
          ['Do you guarantee a provider will contact me?', 'No. Provider response depends on availability, distance, job type, and timing.'],
          ['Should I upload photos?', 'Yes if possible. Photos help providers judge truck size, labour, and whether the request fits their route.'],
        ]
  }
  if (route.type === 'faq') return lang === 'zh'
    ? [
        ['Clearout YYC 是清运公司吗？','不是。Clearout YYC 是本地清运需求分发平台，不拥有车辆，不直接提供清运服务。'],
        ['是否保证一定有服务商联系？','不保证。服务商是否联系取决于可用性、距离、需求类型和时间。'],
        ['客户需要付费吗？','Beta 阶段客户免费提交需求。'],
      ]
    : [
        ['Are you a junk removal company?','No. Clearout YYC is a local junk removal request platform. We do not own vehicles or provide removal services directly.'],
        ['Do you guarantee a provider will contact me?','No. Provider response depends on availability, distance, job type, and timing.'],
        ['Is it free for customers?','Yes. During beta, customers submit requests for free.'],
      ]
  return []
}

function applyStructuredData(route: Route, lang: Lang, path: string) {
  const baseUrl = 'https://clearout.aurorasitesolutions.com'
  const currentUrl = `${baseUrl}${path}`
  const graph: any[] = [
    {
      '@type': 'Organization',
      '@id': 'https://www.aurorasitesolutions.com/#organization',
      name: 'Aurora Site Solutions',
      url: 'https://www.aurorasitesolutions.com',
      brand: { '@type': 'Brand', name: 'Clearout YYC' },
    },
    {
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      name: 'Clearout YYC',
      url: baseUrl,
      publisher: { '@id': 'https://www.aurorasitesolutions.com/#organization' },
      inLanguage: lang === 'zh' ? 'zh-CN' : 'en-CA',
    },
  ]
  const breadcrumbs: any[] = [{ '@type': 'ListItem', position: 1, name: 'Clearout YYC', item: baseUrl }]
  if (route.type === 'areas') breadcrumbs.push({ '@type': 'ListItem', position: 2, name: 'Calgary Areas', item: currentUrl })
  if (route.type === 'request') breadcrumbs.push({ '@type': 'ListItem', position: 2, name: 'Submit Request', item: currentUrl })
  if (route.type === 'providerJoin') breadcrumbs.push({ '@type': 'ListItem', position: 2, name: 'For Providers', item: currentUrl })
  if (route.type === 'faq') breadcrumbs.push({ '@type': 'ListItem', position: 2, name: 'FAQ', item: currentUrl })
  if (route.type === 'service') {
    const service = getServiceBySlug(route.slug)
    breadcrumbs.push({ '@type': 'ListItem', position: 2, name: service?.h1En || 'Service', item: currentUrl })
  }
  if (route.type === 'community') {
    const c = getCommunityBySlug(route.slug)
    breadcrumbs.push({ '@type': 'ListItem', position: 2, name: 'Calgary Areas', item: `${baseUrl}/areas` })
    breadcrumbs.push({ '@type': 'ListItem', position: 3, name: c?.name || 'Community', item: currentUrl })
  }
  graph.push({ '@type': 'BreadcrumbList', '@id': `${currentUrl}#breadcrumb`, itemListElement: breadcrumbs })
  const faqRows = faqRowsForRoute(route, lang)
  if (faqRows.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${currentUrl}#faq`,
      mainEntity: faqRows.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })),
    })
  }
  upsertJsonLd('clearout-yyc-structured-data', { '@context': 'https://schema.org', '@graph': graph })
}

function applySeo(route: Route, lang: Lang) {
  let title = 'Junk Removal in Calgary | Clearout YYC'
  let description = 'Submit a free Calgary junk removal request. Up to 3 local providers may contact you. No phone spam. No moving jobs.'
  let path = window.location.pathname
  if (route.type === 'request') {
    title = 'Submit a Free Junk Removal Request in Calgary | Clearout YYC'
    description = 'Submit one free junk removal request in Calgary. Phone-verified requests may be sent to up to 3 local providers.'
  }
  if (route.type === 'providerJoin') {
    title = 'Get Calgary Junk Removal Leads | Clearout YYC Providers'
    description = 'Join the free beta provider list for Calgary junk removal leads. No app, no monthly fee, platform-managed lead alerts.'
  }
  if (route.type === 'providerLeads') {
    title = 'Provider Lead Access | Clearout YYC'
    description = 'Approved Clearout YYC beta providers can claim available Calgary junk removal leads.'
  }
  if (route.type === 'areas') {
    title = 'Calgary Junk Removal Areas | Clearout YYC'
    description = 'Find Clearout YYC community pages for Calgary junk removal requests, including Beltline, Panorama Hills, Mahogany, Sage Hill, and more.'
  }
  if (route.type === 'service') {
    const service = getServiceBySlug(route.slug)
    if (service) {
      title = lang === 'zh' ? service.titleZh : service.titleEn
      description = lang === 'zh' ? service.metaZh : service.metaEn
      path = serviceUrl(service.slug)
    }
  }
  if (route.type === 'community') {
    const c = communities.find(x => x.slug === route.slug)
    if (c) {
      title = `Junk Removal in ${c.name}, Calgary | Clearout YYC`
      description = `Submit a ${c.name} junk removal request for furniture, garage junk, mattresses, or move-out leftovers. Up to 3 local providers may contact you directly.`
      path = communityUrl(c.slug)
    }
  }
  document.title = title
  upsertMeta('description', description)
  upsertMetaProperty('og:title', title)
  upsertMetaProperty('og:description', description)
  upsertMetaProperty('og:type', 'website')
  upsertMetaProperty('og:url', `https://clearout.aurorasitesolutions.com${path}`)
  upsertCanonical(path)
  applyStructuredData(route, lang, path)
}

function matchingProviders(lead: Lead) {
  const providers = getList<ProviderApplication>('clearout_providers')
  const leadArea = normalizeDispatchArea(lead.area, lead.community_or_postal)
  const leadType = normalizeLeadServiceType(lead.service_tags.length ? lead.service_tags : lead.request_categories)

  return providers
    .filter(p => p.active && p.beta_opt_in)
    .map(p => {
      const providerAreas = normalizeProviderDispatchAreas(p.service_areas)
      const providerTypes = normalizeProviderServiceTypes(p.services_accepted)
      const areaMatch = providerAreas.includes('all_calgary') || leadArea === 'unknown' || providerAreas.includes(leadArea)
      const typeMatch = providerTypes.includes(leadType)
      const tier = areaMatch && typeMatch ? 1 : typeMatch ? 2 : 99
      return { provider: p, tier }
    })
    .filter(item => item.tier < 99)
    .filter(item => item.provider.max_vehicle_level >= lead.required_vehicle_level)
    .filter(item => lead.required_crew_size <= 1 || item.provider.crew_capacity === 'two' || item.provider.crew_capacity === 'three_plus')
    .sort((a, b) => a.tier - b.tier || String(a.provider.last_assigned_at || '').localeCompare(String(b.provider.last_assigned_at || '')))
    .map(item => item.provider)
    .slice(0, 3)
}

export default function App() {
  const [route, setRoute] = useState<Route>(getRoute())
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = window.localStorage.getItem('clearout_lang')
      return saved === 'zh' || saved === 'en' ? saved : 'en'
    } catch {
      return 'en'
    }
  })
  const [menu, setMenu] = useState(false)
  const setPreferredLang = (next: Lang) => {
    try {
      window.localStorage.setItem('clearout_lang', next)
    } catch {
      // Keep the site usable even if localStorage is unavailable.
    }
    setLang(next)
  }
  useEffect(() => { const fn = () => setRoute(getRoute()); window.addEventListener('popstate', fn); return () => window.removeEventListener('popstate', fn) }, [])
  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
    applySeo(route, lang)
  }, [lang, route])
  return <div className="min-h-screen bg-[#faf7ef] text-slate-950">
    <Header lang={lang} setLang={setPreferredLang} menu={menu} setMenu={setMenu} route={route} />
    {route.type === 'home' && <HomePage lang={lang} />}
    {route.type === 'request' && <RequestPage lang={lang} />}
    {route.type === 'providerJoin' && <ProviderPage lang={lang} />}
    {route.type === 'providerLeads' && <ProviderLeadsPage lang={lang} />}
    {route.type === 'providerLead' && <ProviderLeadClaimPage lang={lang} />}
    {route.type === 'admin' && <AdminPage lang={lang} />}
    {route.type === 'faq' && <FAQPage lang={lang} />}
    {route.type === 'areas' && <AreasPage lang={lang} />}
    {route.type === 'service' && <ServicePage lang={lang} slug={route.slug} />}
    {route.type === 'community' && <CommunityPage lang={lang} slug={route.slug} />}
    {route.type === 'privacy' && <LegalPage lang={lang} kind="privacy" />}
    {route.type === 'terms' && <LegalPage lang={lang} kind="terms" />}
    <Footer lang={lang} />
    <MobileStickyCta lang={lang} />
  </div>
}


function Header({ lang, setLang, menu, setMenu, route }: { lang: Lang; setLang: (v: Lang) => void; menu: boolean; setMenu: (v: boolean) => void; route: Route }) {
  const L = copy[lang]
  const nav = [[L.home, '/'], [L.request, '/request'], [lang === 'zh' ? '服务区域' : 'Areas', '/areas'], [L.providers, '/providers'], [L.faq, '/faq']]
  const path = window.location.pathname
  return <header className="sticky top-0 z-50 border-b border-black/5 bg-[#faf7ef]/90 backdrop-blur-xl">
    <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8 lg:px-10">
      <button onClick={() => go('/')} className="flex items-center gap-3 text-left">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-700 text-white shadow-sm"><Truck size={20} /></span>
        <span><b className="block tracking-tight">Clearout YYC</b><span className="hidden text-xs text-slate-500 sm:block">Junk removal leads · Calgary</span></span>
      </button>
      <nav className="hidden items-center gap-6 lg:flex">
        {nav.map(([label, href]) => <button key={href} onClick={() => go(href)} className={cn('text-sm font-semibold transition', path === href || (route.type === 'home' && href === '/') ? 'text-red-700' : 'text-slate-600 hover:text-red-700')}>{label}</button>)}
      </nav>
      <div className="hidden items-center gap-2 lg:flex">
        <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold ring-1 ring-black/10"><Globe2 size={16} />{lang === 'en' ? '中文' : 'EN'}</button>
        <button onClick={() => go('/request')} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700">{L.request}</button>
      </div>
      <button onClick={() => setMenu(!menu)} className="rounded-xl bg-white p-2 ring-1 ring-black/10 lg:hidden">{menu ? <X /> : <Menu />}</button>
    </div>
    {menu && <div className="border-t border-black/5 bg-white px-5 py-4 lg:hidden"><div className="mx-auto grid max-w-6xl gap-1">
      {nav.map(([label, href]) => <button key={href} onClick={() => { setMenu(false); go(href) }} className="rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">{label}</button>)}
      <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">{lang === 'en' ? '切换中文' : 'Switch English'}</button>
    </div></div>}
  </header>
}

function HomePage({ lang }: { lang: Lang }) {
  const L = copy[lang]
  return <main>
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 opacity-75 [background:radial-gradient(circle_at_10%_10%,#fee2e2,transparent_28%),radial-gradient(circle_at_88%_18%,#dcfce7,transparent_25%),radial-gradient(circle_at_50%_100%,#dbeafe,transparent_30%)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:py-24">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-sm font-semibold text-red-800 ring-1 ring-red-900/10"><Sparkles size={16} />{lang === 'zh' ? 'Calgary 本地清运需求分发' : 'Calgary local junk removal requests'}</p>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">{L.heroTitle}</h1>
          <p className="mt-5 text-base leading-8 text-slate-700 sm:text-lg">{L.heroSub}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => go('/request')} className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-7 py-4 text-base font-semibold text-white shadow-sm hover:bg-red-700">{L.heroCta}<ArrowRight size={18} /></button>
            <button onClick={() => go('/providers')} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-base font-semibold text-slate-900 ring-1 ring-black/10 hover:bg-red-50">{L.providerCta}<Users size={18} /></button>
          </div>
          <p className="mt-4 text-sm font-medium text-slate-600">{lang === 'zh' ? '你的需求最多发送给 3 个服务商。不会群发。' : 'Your request is never sent to more than 3 providers. No blasting.'}</p>
        </div>
        <HomeHeroVisual lang={lang} />
      </div>
    </section>
    <TrustStrip lang={lang} />
    <ComparisonBlock lang={lang} />
    <AcceptedRejectedBlock lang={lang} />
    <HowItWorks lang={lang} />
    <PopularServices lang={lang} />
    <PopularAreas lang={lang} />
    <ProviderCTA lang={lang} />
  </main>
}


function HomeHeroVisual({ lang }: { lang: Lang }) {
  const scenarios = lang === 'zh'
    ? [['车库杂物', '旧箱子、工具、季节物品'], ['床垫 / 沙发', '大件清走，客户不用逐家解释'], ['退租剩余', '房东或租客快速提交需求']]
    : [['Garage junk', 'Boxes, tools, seasonal clutter'], ['Mattress / sofa', 'Large items without calling around'], ['Move-out leftovers', 'Quick request for landlords or renters']]
  return <div className="rounded-[2.2rem] bg-white/90 p-4 shadow-xl ring-1 ring-black/5 sm:p-6">
    <div className="rounded-[1.8rem] bg-slate-950 p-5 text-white sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-200">{lang === 'zh' ? '本地清运入口' : 'Local clearout request'}</p>
          <h2 className="mt-3 text-3xl font-semibold">{lang === 'zh' ? '清楚、轻量、不会群发。' : 'Clear, local, and not blasted.'}</h2>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-red-100 ring-1 ring-white/10">YYC</span>
      </div>
      <div className="mt-6 grid gap-3">
        {scenarios.map(([title, body]) => <div key={title} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
          <div className="flex items-center justify-between gap-3"><b>{title}</b><Truck size={18} className="text-red-200"/></div>
          <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
        </div>)}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-slate-200">
        <div className="rounded-2xl bg-white/10 p-3"><Phone className="mx-auto mb-1 text-emerald-300" size={17}/>{lang === 'zh' ? '电话验证' : 'Phone verified'}</div>
        <div className="rounded-2xl bg-white/10 p-3"><Users className="mx-auto mb-1 text-emerald-300" size={17}/>{lang === 'zh' ? '最多 3 个' : 'Max 3'}</div>
        <div className="rounded-2xl bg-white/10 p-3"><MapPin className="mx-auto mb-1 text-emerald-300" size={17}/>{lang === 'zh' ? '按社区' : 'Area tagged'}</div>
      </div>
    </div>
  </div>
}

function TrustStrip({ lang }: { lang: Lang }) {
  const items = lang === 'zh' ? [
    ['最多 3 个服务商', '避免电话轰炸'], ['只做清运', '不做搬家和贵重物品搬运'], ['先确认电话', '分享给服务商前先确认手机号'], ['本地社区匹配', '按 Calgary 区域分发'],
  ] : [
    ['Max 3 providers', 'No phone blasting'], ['Junk only', 'No moving or valuable-item transport'], ['Phone verified', 'Customer phone confirmed before dispatch'], ['Local matching', 'Dispatched by Calgary area'],
  ]
  return <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{items.map(([a,b]) => <div key={a} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"><b>{a}</b><p className="mt-2 text-sm text-slate-600">{b}</p></div>)}</div></section>
}

function ComparisonBlock({ lang }: { lang: Lang }) {
  const left = lang === 'zh' ? ['搜 5 家公司', '重复解释物品', '等回电', '担心被骚扰'] : ['Search 5 companies', 'Repeat the same details', 'Wait for callbacks', 'Risk phone spam']
  const right = lang === 'zh' ? ['一次提交', '照片和描述一起发', '最多 3 个本地服务商', '你直接和服务商确认'] : ['Submit once', 'Photos and details included', 'Up to 3 local providers', 'Confirm directly with provider']
  return <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-10"><SectionHead eyebrow={lang === 'zh' ? '旧方式 vs 简化方式' : 'Calling around vs submit once'} title={lang === 'zh' ? '把重复沟通变成一次提交。' : 'Turn repeated calls into one request.'} text={lang === 'zh' ? '你不需要把同一堆垃圾描述给五家公司。' : 'You should not have to describe the same pile of junk to five companies.'} />
    <div className="mt-8 grid gap-5 md:grid-cols-2">
      <CompareCard title={lang === 'zh' ? '自己找公司' : 'Calling companies yourself'} rows={left} muted />
      <CompareCard title="Clearout YYC" rows={right} />
    </div>
  </section>
}

function AcceptedRejectedBlock({ lang }: { lang: Lang }) {
  const ok = lang === 'zh' ? ['床垫 / 沙发 / 家具', '退租剩余杂物', '车库 / 地下室清理', '家电 / 电子废料', '庭院垃圾 / 树枝'] : ['Mattress / sofa / furniture', 'Move-out leftovers', 'Garage / basement cleanouts', 'Appliances / electronics', 'Yard waste / branches']
  const blocked = lang === 'zh' ? ['油漆 / 化学品', '煤气罐', '机油 / 汽车电池', '石棉或不明危险物', '完整搬家 / 贵重物品运输'] : ['Paint / chemicals', 'Propane tanks', 'Motor oil / car batteries', 'Asbestos or unknown hazardous waste', 'Full moving / valuable-item transport']
  return <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-10"><div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
    <SectionHead eyebrow={lang === 'zh' ? '清运边界' : 'Junk-only scope'} title={lang === 'zh' ? '我们只做普通清运需求分发。' : 'We distribute regular junk removal requests only.'} text={lang === 'zh' ? '危险物品、完整搬家和贵重物品运输不作为普通清运单自动分发。' : 'Hazardous items, full moving, and valuable-item transport are not dispatched as regular junk removal leads.'} />
    <div className="mt-8 grid gap-5 md:grid-cols-2">
      <div className="rounded-[1.5rem] bg-green-50 p-5"><h3 className="font-semibold text-green-950">{lang === 'zh' ? '适合提交' : 'Good fit'}</h3><ul className="mt-4 grid gap-2 text-sm text-green-900">{ok.map(x => <li key={x}>✔ {x}</li>)}</ul></div>
      <div className="rounded-[1.5rem] bg-red-50 p-5"><h3 className="font-semibold text-red-950">{lang === 'zh' ? '不自动分发' : 'Not auto-dispatched'}</h3><ul className="mt-4 grid gap-2 text-sm text-red-900">{blocked.map(x => <li key={x}>⚠ {x}</li>)}</ul></div>
    </div>
  </div></section>
}

function HowItWorks({ lang }: { lang: Lang }) {
  const steps = lang === 'zh' ? [
    ['1', '提交需求', '选择清运类别、规模、位置，上传照片可选。'],
    ['2', '系统分发', '符合条件的需求最多发送给 3 个 opt-in 服务商。'],
    ['3', '直接联系', '服务商直接联系你确认价格、时间和服务细节。'],
  ] : [
    ['1', 'Submit request', 'Choose category, rough size, location, and optional photos.'],
    ['2', 'System dispatches', 'Eligible requests go to up to 3 opt-in providers.'],
    ['3', 'Providers contact you', 'Providers confirm final price, timing, and details directly.'],
  ]
  return <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-10"><SectionHead centered eyebrow={lang === 'zh' ? '流程' : 'How it works'} title={lang === 'zh' ? '简单，但边界清楚。' : 'Simple, with clear boundaries.'} text={lang === 'zh' ? 'Clearout YYC 不是清运公司，不处理付款和服务纠纷。' : 'Clearout YYC is not a junk removal company and does not handle payment or service disputes.'} />
    <div className="mt-8 grid gap-5 md:grid-cols-3">{steps.map(([n,t,d]) => <div key={n} className="rounded-[1.7rem] bg-white p-6 shadow-sm ring-1 ring-black/5"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 font-semibold text-white">{n}</span><h3 className="mt-5 text-lg font-semibold">{t}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{d}</p></div>)}</div>
  </section>
}


function PopularAreas({ lang }: { lang: Lang }) {
  const featured = communities.slice(0, 12)
  return <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-10">
    <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHead eyebrow={lang === 'zh' ? 'Calgary 社区' : 'Popular Calgary areas'} title={lang === 'zh' ? '按社区提交清运需求。' : 'Junk removal pages by Calgary community.'} text={lang === 'zh' ? '社区页不是堆关键词；从社区页提交会自动带入社区和大区。' : 'Community pages are local request entry points; submissions are pre-filled with community and area.'} />
        <button onClick={() => go('/areas')} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700">{lang === 'zh' ? '查看全部区域' : 'View all areas'}</button>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map(c => <button key={c.slug} onClick={() => go(communityUrl(c.slug))} className="rounded-2xl bg-[#faf7ef] p-4 text-left text-sm font-semibold text-slate-800 ring-1 ring-black/5 hover:bg-red-50 hover:text-red-700">{lang === 'zh' ? `${c.name} 清运` : `Junk removal in ${c.name}`}<span className="mt-1 block text-xs font-medium text-slate-500">{areaName(c.area, lang)}</span></button>)}
      </div>
    </div>
  </section>
}

function AreasPage({ lang }: { lang: Lang }) {
  const groups: Area[] = ['central', 'nw', 'ne', 'sw', 'se']
  return <main>
    <PageHero eyebrow={lang === 'zh' ? '服务区域' : 'Service areas'} title={lang === 'zh' ? 'Calgary areas we cover' : 'Calgary areas we cover'} text={lang === 'zh' ? '选择你的社区，提交一个带社区标签的普通清运需求。社区页提交会自动带入社区和大区。' : 'Choose your area to submit a community-tagged junk removal request. Community pages pre-fill both community and area.'} />
    <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-10">
      <div className="grid gap-7">
        {groups.map(area => {
          const rows = communities.filter(c => c.area === area)
          if (!rows.length) return null
          return <div key={area} className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-7">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-red-700">{areaName(area, lang)}</p>
                <h2 className="mt-2 text-2xl font-semibold">{lang === 'zh' ? `${areaName(area, lang)} 社区` : `${areaName(area, lang)} communities`}</h2>
              </div>
              <p className="text-sm text-slate-500">{lang === 'zh' ? '点击社区进入本地入口页' : 'Open a local request entry page'}</p>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map(c => <button key={c.slug} onClick={() => go(communityUrl(c.slug))} className="rounded-[1.35rem] bg-[#faf7ef] p-5 text-left ring-1 ring-black/5 transition hover:bg-red-50 hover:ring-red-100">
                <h3 className="text-lg font-semibold text-slate-950">{lang === 'zh' ? `${c.name} 清运` : `Junk Removal in ${c.name}`}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{lang === 'zh' ? c.noteZh : c.noteEn}</p>
                <span className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-100">{lang === 'zh' ? '提交社区需求' : 'Submit community request'}</span>
              </button>)}
            </div>
          </div>
        })}
      </div>
    </section>
  </main>
}


function PopularServices({ lang }: { lang: Lang }) {
  return <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-10">
    <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHead eyebrow={lang === 'zh' ? '服务类型' : 'Service pages'} title={lang === 'zh' ? '按清运类型提交需求。' : 'Submit by junk removal type.'} text={lang === 'zh' ? '服务类型页覆盖更直接的搜索意图，例如家具、车库、退租和装修尾料。' : 'Service pages cover high-intent searches like furniture removal, garage cleanouts, move-out clearouts, and renovation debris.'} />
        <button onClick={() => go('/request')} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-red-50">{lang === 'zh' ? '直接提交需求' : 'Submit request'}</button>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {servicePages.map(service => <button key={service.slug} onClick={() => go(serviceUrl(service.slug))} className="rounded-2xl bg-white/10 p-4 text-left ring-1 ring-white/10 transition hover:bg-white hover:text-slate-950">
          <h3 className="font-semibold">{lang === 'zh' ? service.titleZh.replace(' | Clearout YYC','') : service.titleEn.replace(' | Clearout YYC','')}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-300 group-hover:text-slate-600">{lang === 'zh' ? service.metaZh : service.metaEn}</p>
        </button>)}
      </div>
    </div>
  </section>
}

function ServicePage({ lang, slug }: { lang: Lang; slug: string }) {
  const service = getServiceBySlug(slug) || servicePages[0]
  const related = service.relatedCommunities.map(x => getCommunityBySlug(x)).filter(Boolean) as Community[]
  const faqs = lang === 'zh' ? service.faqZh : service.faqEn
  const common = lang === 'zh' ? service.commonZh : service.commonEn
  const goodFit = lang === 'zh' ? service.goodFitZh : service.goodFitEn
  const notFor = lang === 'zh' ? service.notForZh : service.notForEn
  return <main>
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 opacity-75 [background:radial-gradient(circle_at_12%_10%,#fee2e2,transparent_28%),radial-gradient(circle_at_92%_18%,#dcfce7,transparent_24%),radial-gradient(circle_at_50%_105%,#dbeafe,transparent_28%)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:py-18">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-sm font-semibold text-red-800 ring-1 ring-red-900/10"><Truck size={16}/>{lang === 'zh' ? 'Calgary 服务类型入口' : 'Calgary service request page'}</p>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">{lang === 'zh' ? service.h1Zh : service.h1En}</h1>
          <p className="mt-5 text-base leading-8 text-slate-700 sm:text-lg">{lang === 'zh' ? service.introZh : service.introEn}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => go(requestUrlForService(service.slug))} className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-7 py-4 font-semibold text-white hover:bg-red-700">{lang === 'zh' ? '提交这个类型的需求' : 'Submit this request type'}<ArrowRight size={18}/></button>
            <button onClick={() => go('/areas')} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 font-semibold ring-1 ring-black/10 hover:bg-red-50">{lang === 'zh' ? '按社区查找' : 'Browse by community'}</button>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">{lang === 'zh' ? 'Clearout YYC 不是清运公司；我们把符合条件的普通清运需求分发给最多 3 个本地独立服务商。' : 'Clearout YYC is not a junk removal company; eligible requests may be shared with up to 3 independent local providers.'}</p>
        </div>
        <div className="grid gap-4">
          <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-black/5">
            <h2 className="text-2xl font-semibold">{lang === 'zh' ? '常见需求' : 'Common requests'}</h2>
            <div className="mt-5 grid gap-3">{common.map(x => <div key={x} className="flex items-center gap-3 rounded-2xl bg-[#faf7ef] p-3 text-sm font-semibold"><CheckCircle2 className="text-emerald-600" size={18}/>{x}</div>)}</div>
          </div>
          <div className="rounded-[2rem] bg-red-50 p-6 ring-1 ring-red-100">
            <h2 className="text-xl font-semibold text-red-950">{lang === 'zh' ? '不适合' : 'Not for'}</h2>
            <div className="mt-4 grid gap-2">{notFor.map(x => <div key={x} className="flex items-center gap-3 text-sm font-semibold text-red-900"><AlertTriangle size={16}/>{x}</div>)}</div>
          </div>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-10">
      <div className="grid gap-5 lg:grid-cols-[.95fr_1.05fr]">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="text-2xl font-semibold">{lang === 'zh' ? '本地清运说明' : 'Local pickup notes'}</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">{lang === 'zh' ? service.localZh : service.localEn}</p>
          <p className="mt-4 text-sm leading-7 text-slate-600">{lang === 'zh' ? '这不是报价承诺。最终价格、时间、付款和服务细节由你和服务商直接确认。' : 'This is not a price promise. Final price, timing, payment, and service details are confirmed directly with the provider.'}</p>
        </div>
        <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-sm">
          <h2 className="text-2xl font-semibold">{lang === 'zh' ? '适合提交' : 'Good fit'}</h2>
          <div className="mt-5 grid gap-3">{goodFit.map(x => <div key={x} className="rounded-2xl bg-white/10 p-4 text-sm font-semibold text-slate-100">✔ {x}</div>)}</div>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-5 pb-12 sm:px-8 lg:px-10">
      <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="text-2xl font-semibold">{lang === 'zh' ? 'FAQ' : `${service.h1En.replace('Requests in Calgary','FAQ')}`}</h2>
          <div className="mt-5 divide-y divide-black/10">{faqs.map(([q,a]) => <div key={q} className="py-4"><h3 className="font-semibold text-slate-950">{q}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{a}</p></div>)}</div>
        </div>
        <div className="rounded-[2rem] bg-[#faf7ef] p-6 ring-1 ring-black/5">
          <h2 className="text-2xl font-semibold">{lang === 'zh' ? '相关社区入口' : 'Related community pages'}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{lang === 'zh' ? '也可以按社区提交，系统会自动带入社区和大区。' : 'You can also submit by community so the form auto-tags the request area.'}</p>
          <div className="mt-5 grid gap-3">{related.map(n => <button key={n.slug} onClick={() => go(communityUrl(n.slug))} className="rounded-2xl bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900 ring-1 ring-black/5 hover:bg-red-50 hover:text-red-700">{lang === 'zh' ? `${n.name} 清运需求` : `Junk removal in ${n.name}`}</button>)}</div>
          <button onClick={() => go(requestUrlForService(service.slug))} className="mt-6 w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700">{lang === 'zh' ? '提交需求' : 'Submit request'}</button>
        </div>
      </div>
    </section>
  </main>
}

function CommunityPage({ lang, slug }: { lang: Lang; slug: string }) {
  const c = communities.find(x => x.slug === slug) || communities[0]
  const notFor = lang === 'zh'
    ? ['完整搬家服务', '贵重物品运输', '危险废物', '油漆 / 化学品', '煤气罐', '石棉或不明危险材料']
    : ['Full moving jobs', 'High-value item transport', 'Hazardous waste', 'Paint / chemicals', 'Propane tanks', 'Asbestos or unknown hazardous material']
  const howItWorks = lang === 'zh'
    ? [['1', '提交需求', '选择物品类型、规模、位置和时间，并尽量上传照片。'], ['2', '社区自动带入', `系统把需求标记为 ${c.name} 和 ${areaName(c.area, lang)}。`], ['3', '服务商直接联系', '符合条件时，最多 3 个本地独立清运服务商可能联系你。']]
    : [['1', 'Submit the request', 'Choose item type, rough size, location, timing, and upload photos if available.'], ['2', 'Community is tagged', `The request is marked as ${c.name} and ${areaName(c.area, lang)}.`], ['3', 'Providers contact you', 'If eligible, up to 3 independent local providers may contact you directly.']]
  const faqs = lang === 'zh'
    ? [
        ['Clearout YYC 是清运公司吗？', '不是。Clearout YYC 是普通清运需求分发平台，不直接上门清运。'],
        [`提交 ${c.name} 需求收费吗？`, '客户提交需求免费。最终价格、时间、付款和服务由你和服务商直接确认。'],
        ['是否保证一定有服务商联系？', '不保证。是否联系取决于服务商可用性、距离、需求类型和时间。'],
        ['我应该上传照片吗？', '建议上传。照片能帮助服务商判断车次、人工和是否适合承接。'],
      ]
    : [
        ['Is Clearout YYC a junk removal company?', 'No. Clearout YYC is a request platform. We do not perform junk removal directly.'],
        [`Is it free to submit a ${c.name} request?`, 'Yes. Customer submission is free. Final price, timing, payment, and service details are arranged directly with the provider.'],
        ['Do you guarantee a provider will contact me?', 'No. Provider response depends on availability, distance, job type, and timing.'],
        ['Should I upload photos?', 'Yes if possible. Photos help providers judge truck size, labour, and whether the request fits their route.'],
      ]
  const common = lang === 'zh' ? c.commonZh : c.commonEn
  const nearbyCommunities = c.nearby.map(n => communities.find(x => x.name === n || x.name.replace(' Calgary','') === n)).filter(Boolean) as Community[]
  return <main>
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 opacity-70 [background:radial-gradient(circle_at_12%_10%,#fee2e2,transparent_28%),radial-gradient(circle_at_90%_20%,#dcfce7,transparent_24%)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:py-18">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-sm font-semibold text-red-800 ring-1 ring-red-900/10"><MapPin size={16}/>{areaName(c.area, lang)}</p>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">{lang === 'zh' ? `${c.name} 垃圾清运需求` : `Junk Removal Requests in ${c.name}`}</h1>
          <p className="mt-5 text-base leading-8 text-slate-700 sm:text-lg">{lang === 'zh' ? c.introZh : c.introEn}</p>
          <div className="mt-5 rounded-[1.5rem] bg-white/85 p-5 text-sm leading-6 text-slate-700 ring-1 ring-black/5">
            <b className="text-slate-950">{lang === 'zh' ? '本地入口，不是关键词堆砌' : 'A local request entry point, not a keyword page'}</b>
            <p className="mt-2">{lang === 'zh' ? `从本页提交会自动带入 ${c.name}。你不需要重复解释所在社区；表单会保存 community_slug、community_or_postal 和 area。` : `Submitting from this page automatically carries ${c.name} into the request form. The form saves community_slug, community_or_postal, and area for provider matching.`}</p>
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row"><button onClick={() => go(requestUrlForCommunity(c.slug))} className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-7 py-4 font-semibold text-white hover:bg-red-700">{lang === 'zh' ? `提交 ${c.name} 清运需求` : `Submit a ${c.name} Request`}<ArrowRight size={18}/></button><button onClick={() => go('/areas')} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 font-semibold ring-1 ring-black/10 hover:bg-red-50">{lang === 'zh' ? '查看其他社区' : 'View other areas'}</button></div>
        </div>
        <div className="grid gap-4">
          <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl ring-1 ring-black/5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-200">{lang === 'zh' ? '提交时自动带入' : 'Auto-tagged on submit'}</p>
            <h2 className="mt-3 text-2xl font-semibold">{c.name}</h2>
            <div className="mt-5 grid gap-3 text-sm text-slate-300">
              <p>✔ {lang === 'zh' ? `社区：${c.name}` : `Community: ${c.name}`}</p>
              <p>✔ {lang === 'zh' ? `大区：${areaName(c.area, lang)}` : `Area: ${areaName(c.area, lang)}`}</p>
              <p>✔ {lang === 'zh' ? '客户免费提交，最多 3 个服务商可能联系' : 'Free customer submission; up to 3 providers may contact you'}</p>
            </div>
          </div>
          <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-black/5">
            <h2 className="text-2xl font-semibold">{lang === 'zh' ? `${c.name} 常见需求` : `Common ${c.name} requests`}</h2>
            <div className="mt-5 grid gap-3">{common.map(x => <div key={x} className="flex items-center gap-3 rounded-2xl bg-[#faf7ef] p-3 text-sm font-semibold"><CheckCircle2 className="text-emerald-600" size={18}/>{x}</div>)}</div>
          </div>
          <div className="rounded-[2rem] bg-red-50 p-6 ring-1 ring-red-100">
            <h2 className="text-xl font-semibold text-red-950">{lang === 'zh' ? '不适用于' : 'Not for'}</h2>
            <div className="mt-4 grid gap-2">{notFor.map(x => <div key={x} className="flex items-center gap-3 text-sm font-semibold text-red-900"><AlertTriangle size={16}/>{x}</div>)}</div>
          </div>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-10">
      <div className="grid gap-5 lg:grid-cols-[.95fr_1.05fr]">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="text-2xl font-semibold">{lang === 'zh' ? `${c.name} 本地清运注意点` : `${c.name} local pickup notes`}</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">{lang === 'zh' ? c.localZh : c.localEn}</p>
          <p className="mt-4 text-sm leading-7 text-slate-600">{lang === 'zh' ? '这不是报价承诺，也不是服务担保。服务商会直接与你确认最终价格、时间、付款和服务细节。' : 'This is not a price promise or service guarantee. Providers confirm final price, timing, payment, and service details directly with you.'}</p>
        </div>
        <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-sm">
          <h2 className="text-2xl font-semibold">{lang === 'zh' ? '流程' : 'How it works'}</h2>
          <div className="mt-5 grid gap-3">{howItWorks.map(([n,t,d]) => <div key={n} className="rounded-2xl bg-white/10 p-4"><span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-950">{n}</span><h3 className="mt-3 font-semibold">{t}</h3><p className="mt-1 text-sm leading-6 text-slate-300">{d}</p></div>)}</div>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-5 pb-12 sm:px-8 lg:px-10">
      <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="text-2xl font-semibold">{lang === 'zh' ? `${c.name} FAQ` : `${c.name} junk removal FAQ`}</h2>
          <div className="mt-5 divide-y divide-black/10">{faqs.map(([q,a]) => <div key={q} className="py-4"><h3 className="font-semibold text-slate-950">{q}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{a}</p></div>)}</div>
        </div>
        <div className="rounded-[2rem] bg-[#faf7ef] p-6 ring-1 ring-black/5">
          <h2 className="text-2xl font-semibold">{lang === 'zh' ? '附近社区' : 'Nearby community pages'}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{lang === 'zh' ? '如果你不在这个社区，可以选择附近社区入口，或直接提交 Calgary 清运需求。' : 'If this is not your exact community, choose a nearby entry page or submit a general Calgary request.'}</p>
          <div className="mt-5 grid gap-3">{nearbyCommunities.map(n => <button key={n.slug} onClick={() => go(communityUrl(n.slug))} className="rounded-2xl bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900 ring-1 ring-black/5 hover:bg-red-50 hover:text-red-700">{lang === 'zh' ? `${n.name} 清运需求` : `Junk removal in ${n.name}`}</button>)}</div>
          <button onClick={() => go(requestUrlForCommunity(c.slug))} className="mt-6 w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700">{lang === 'zh' ? `提交 ${c.name} 需求` : `Submit a ${c.name} Request`}</button>
        </div>
      </div>
    </section>
  </main>
}

function RequestPage({ lang }: { lang: Lang }) { return <main><PageHero eyebrow={lang === 'zh' ? '客户需求' : 'Customer request'} title={lang === 'zh' ? '免费提交清运需求' : 'Submit a free junk removal request'} text={lang === 'zh' ? '30 秒点选。你的需求最多发送给 3 个本地清运服务商。' : 'Tap through in about 30 seconds. Your request may be sent to up to 3 local providers.'} /><section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-10"><RequestForm lang={lang} /></section></main> }

function RequestForm({ lang }: { lang: Lang }) {
  const params = new URLSearchParams(window.location.search)
  const initialCommunity = getCommunityBySlug(params.get('community'))
  const initialService = getServiceBySlug(params.get('service'))
  const [categories, setCategories] = useState<string[]>(initialService?.categoryIds || [])
  const [amount, setAmount] = useState<Lead['rough_amount']>('one_item')
  const [location, setLocation] = useState<Lead['item_location']>('driveway_garage')
  const [timing, setTiming] = useState<Lead['timing']>('this_week')
  const [regular, setRegular] = useState<string[]>([])
  const [blocked, setBlocked] = useState<string[]>([])
  const [communitySlug, setCommunitySlug] = useState<string>(initialCommunity?.slug || 'other')
  const [contact, setContact] = useState({ name: '', phone: '', email: '', community: initialCommunity?.name || '', area: (initialCommunity?.area || 'unknown') as Area, description: '' })
  const [photos, setPhotos] = useState<FileMeta[]>([])
  const [leadPhotos, setLeadPhotos] = useState<PreparedLeadPhoto[]>([])
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [otpSentAt, setOtpSentAt] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpBusy, setOtpBusy] = useState(false)
  const [otpMessage, setOtpMessage] = useState('')
  const [consent, setConsent] = useState(false)
  const [real, setReal] = useState(false)
  const [done, setDone] = useState<{ lead: Lead; dispatched: number } | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const manualCaptcha = useManualCaptcha()

  const classification = useMemo(() => classifyLead({ categories, amount, timing, location, regular, blocked }), [categories, amount, timing, location, regular, blocked])
  const photoMetaFromPrepared = (items: PreparedLeadPhoto[]): FileMeta[] => items.map(p => ({
    file_name: p.file_name,
    file_size: p.file_size,
    file_type: p.mime_type,
    uploaded_at: new Date().toISOString(),
    review_status: 'uploaded',
  }))

  const setPreparedPhotos = (items: PreparedLeadPhoto[]) => {
    const normalized = items.slice(0, 2).map((photo, index) => ({
      ...photo,
      sort_order: index,
    }))

    setLeadPhotos(normalized)
    setPhotos(photoMetaFromPrepared(normalized))
  }

  const photoHandler = async (files: FileList | null) => {
    setPhotoError('')

    const selected = Array.from(files || [])
    if (!selected.length) return

    const remainingSlots = 2 - leadPhotos.length
    if (remainingSlots <= 0) {
      setPhotoError(lang === 'zh' ? '最多只能上传 2 张照片。请先删除一张再重新选择。' : 'You can upload up to 2 photos. Remove one before choosing another.')
      return
    }

    setPhotoBusy(true)

    try {
      const prepared: PreparedLeadPhoto[] = []
      const usable = selected.slice(0, remainingSlots)

      for (let i = 0; i < usable.length; i++) {
        prepared.push(await compressLeadPhoto(usable[i], leadPhotos.length + i))
      }

      setPreparedPhotos([...leadPhotos, ...prepared])

      if (selected.length > remainingSlots) {
        setPhotoError(lang === 'zh' ? '最多只能上传 2 张照片，多余照片已忽略。' : 'You can upload up to 2 photos. Extra photos were ignored.')
      }
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : String(e))
    } finally {
      setPhotoBusy(false)
    }
  }

  const removeLeadPhoto = (index: number) => {
    setPhotoError('')
    setPreparedPhotos(leadPhotos.filter((_, i) => i !== index))
  }

  const communitySelectOptions = [{ id: 'other', en: 'Other / not sure', zh: '其他 / 不确定' }, ...communities.map(c => ({ id: c.slug, en: `${c.name} (${areaName(c.area, 'en')})`, zh: `${c.name}（${areaName(c.area, 'zh')}）` }))]
  function chooseCommunity(slug: string) {
    setCommunitySlug(slug)
    const c = getCommunityBySlug(slug)
    setContact(prev => c ? { ...prev, community: c.name, area: c.area } : { ...prev, community: '', area: 'unknown' as Area })
  }

  async function sendPhoneCode() {
    setError('')
    setOtpMessage('')

    const normalizedCustomerPhone = normalizeNorthAmericanPhone(contact.phone)
    if (!normalizedCustomerPhone) {
      setError(lang === 'zh' ? '请输入有效的 10 位电话号码，例如 403-555-1234。' : 'Please enter a valid 10-digit phone number, such as 403-555-1234.')
      return
    }

    try {
      setOtpBusy(true)
      await postRemoteJson('/api/verify/start', {
        phone: normalizedCustomerPhone,
        type: 'customer_lead',
      })
      setPhoneVerified(false)
      setOtpSentAt(new Date().toISOString())
      setOtpMessage(lang === 'zh' ? '验证码已发送，请查看手机短信。' : 'Verification code sent. Please check your phone.')
    } catch (e) {
      setOtpMessage('')
      setError(e instanceof Error ? e.message : (lang === 'zh' ? '验证码发送失败，请稍后再试。' : 'Failed to send verification code. Please try again.'))
    } finally {
      setOtpBusy(false)
    }
  }

  async function verifyPhoneCode() {
    setError('')
    setOtpMessage('')

    const normalizedCustomerPhone = normalizeNorthAmericanPhone(contact.phone)
    if (!normalizedCustomerPhone) {
      setError(lang === 'zh' ? '请输入有效的 10 位电话号码，例如 403-555-1234。' : 'Please enter a valid 10-digit phone number, such as 403-555-1234.')
      return
    }

    const code = otpCode.trim()
    if (!/^\d{4,8}$/.test(code)) {
      setError(lang === 'zh' ? '请输入短信验证码。' : 'Please enter the SMS verification code.')
      return
    }

    try {
      setOtpBusy(true)
      const result = await postRemoteJson<{ ok?: boolean; verified?: boolean }>('/api/verify/check', {
        phone: normalizedCustomerPhone,
        code,
        type: 'customer_lead',
      })

      if (!result?.verified) {
        setPhoneVerified(false)
        setError(lang === 'zh' ? '验证码不正确，请重试。' : 'The code is not valid. Please try again.')
        return
      }

      setPhoneVerified(true)
      setOtpMessage(lang === 'zh' ? '电话号码已验证。' : 'Phone number verified.')
    } catch (e) {
      setPhoneVerified(false)
      setOtpMessage('')
      setError(e instanceof Error ? e.message : (lang === 'zh' ? '验证码校验失败，请稍后再试。' : 'Failed to verify code. Please try again.'))
    } finally {
      setOtpBusy(false)
    }
  }

  async function submit() {
    setError('')
    if (submitting) return
    if (!categories.length) { setError(lang === 'zh' ? '请选择至少一个清运类别。' : 'Choose at least one category.'); return }
    if (!contact.name.trim() || !contact.phone.trim() || !contact.community.trim()) { setError(lang === 'zh' ? '请填写姓名、电话和社区/邮编。' : 'Please enter name, phone, and community/postal code.'); return }

    const normalizedCustomerPhone = normalizeNorthAmericanPhone(contact.phone)
    if (!normalizedCustomerPhone) { setError(lang === 'zh' ? '请输入有效的 10 位电话号码，例如 403-555-1234。' : 'Please enter a valid 10-digit phone number, such as 403-555-1234.'); return }

    if (!phoneVerified) {
      setError(lang === 'zh' ? '请先完成手机短信验证。' : 'Please verify your phone number by SMS before submitting.')
      return
    }

    const normalizedCustomerEmail = normalizeOptionalEmail(contact.email)
    if (normalizedCustomerEmail === null) { setError(lang === 'zh' ? '请输入有效的邮箱地址，或留空。' : 'Please enter a valid email address, or leave this field blank.'); return }
    if (!consent || !real) { setError(lang === 'zh' ? '请确认真实需求和联系方式分享同意。' : 'Please confirm this is a real request and consent to contact sharing.'); return }
    if (!isManualCaptchaReady(manualCaptcha)) { setError(lang === 'zh' ? '请输入人工验证码答案。' : 'Please enter the manual verification answer.'); return }

    const pricing = getLeadPricing(classification.grade, timing === 'today' || timing === 'tomorrow')
    const consentAt = new Date().toISOString()
    const leadBase: Omit<Lead, 'dispatch_summary'> = {
      lead_id: uid('lead'), customer_token: uid('customer').replace('customer_', ''), created_at: new Date().toISOString(), language: lang,
      status: classification.eligible ? 'submitted' : 'rejected_special_item',
      customer_name: contact.name.trim(), customer_phone: normalizedCustomerPhone, customer_email: normalizedCustomerEmail || '', community_slug: communitySlug === 'other' ? '' : communitySlug, community_or_postal: contact.community, area: contact.area,
      consent_contact_share: consent, consent_real_request: real, customer_consent_at: consentAt, no_phone_spam_limit: 3, phone_verified: phoneVerified, phone_verified_at: phoneVerified ? new Date().toISOString() : '', otp_sent_at: otpSentAt, otp_attempts: 0, verification_method: 'sms_otp',
      request_categories: categories, rough_amount: amount, item_location: location, timing, request_description: contact.description, photos,
      regular_special_items: regular, blocked_or_hazardous_items: blocked, service_tags: [normalizeLeadServiceType(categories)], risk_flags: classification.riskFlags,
      lead_grade: classification.grade, dispatch_eligible: classification.eligible, rejection_reason: classification.reason,
      required_vehicle_level: classification.vehicle, required_crew_size: classification.crew,
      future_lead_access_fee: pricing.shared[0], lead_access_fee: 0, sold_count: 0, max_sold_count: 3, access_mode: 'open', shared_access_prices: pricing.shared, exclusive_access_fee: pricing.exclusive, current_shared_access_fee: pricing.shared[0],
      contact_release_mode: 'free_beta', payment_status: 'free_beta', refund_status: 'none',
    }
    const lead: Lead = { ...leadBase, dispatch_summary: buildLeadSummary({ ...leadBase, dispatch_summary: '' }, lang) }

    try {
      setSubmitting(true)
      if (isRemoteApiEnabled()) {
        const remote = await postRemoteJson<{ ok?: boolean; createdDispatches?: number; warning?: string }>('/api/leads', {
          lead,
          source: 'clearout_yyc_request_form',
          source_url: window.location.href,
          manualCaptcha: manualCaptchaPayload(manualCaptcha),
          leadPhotos: leadPhotos.map(({ preview_url, original_size, ...photo }) => photo),
        })
        saveList<Lead>('clearout_leads', lead)
        setDone({ lead, dispatched: Number(remote?.createdDispatches || 0) })
        return
      }

      saveList<Lead>('clearout_leads', lead)
      let dispatched = 0
      if (lead.dispatch_eligible) {
        const matches = matchingProviders(lead)
        matches.forEach(p => {
          const sms = `Clearout YYC beta lead: Pending phone confirmation. ${lead.community_or_postal}. ${lead.dispatch_summary}. Customer: ${lead.customer_name}, ${lead.customer_phone}. Reply STOP to opt out.`
          saveList<Dispatch>('clearout_dispatches', { dispatch_id: uid('dispatch'), lead_id: lead.lead_id, provider_id: p.application_id, provider_name: p.provider_display_name, provider_phone: p.phone, sent_at: new Date().toISOString(), channel: p.preferred_notification === 'email' ? 'email' : 'sms', contact_released: true, payment_status: 'free_beta', lead_access_fee: 0, future_lead_access_fee: lead.future_lead_access_fee, shared_access_prices: lead.shared_access_prices, exclusive_access_fee: lead.exclusive_access_fee, sold_count_at_dispatch: lead.sold_count, phone_verified: lead.phone_verified, sms_preview: sms })
          dispatched += 1
        })
        if (dispatched) {
          const leads = getList<Lead>('clearout_leads')
          setList('clearout_leads', leads.map(l => l.lead_id === lead.lead_id ? { ...l, status: 'dispatched_free_beta', sold_count: dispatched } : l))
          lead.status = 'dispatched_free_beta'
          lead.sold_count = dispatched
        }
      }
      setDone({ lead, dispatched })
    } catch (e) {
      setError(e instanceof Error ? e.message : (lang === 'zh' ? '提交失败，请稍后再试。' : 'Submission failed. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (done) return <div className="grid gap-6 lg:grid-cols-[1fr_.8fr]"><div className="rounded-[2rem] bg-white p-7 shadow-sm ring-1 ring-black/5"><CheckCircle2 className="text-green-700" size={36}/><h2 className="mt-4 text-3xl font-semibold">{lang === 'zh' ? '已提交' : 'Request submitted'}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{done.lead.dispatch_eligible ? (lang === 'zh' ? '需求已收到。Clearout YYC 可能会把符合条件的需求发送给最多 3 个本地服务商；不保证一定有人联系。' : 'Request received. Clearout YYC may share eligible requests with up to 3 local providers; provider response is not guaranteed.') : (lang === 'zh' ? '这个需求包含可能需要特殊处理的物品，未作为普通清运单自动分发。' : 'This request includes items that may require special handling and was not auto-dispatched as a regular junk lead.')}</p><button onClick={() => { setDone(null); go('/request') }} className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white">{lang === 'zh' ? '再提交一个' : 'Submit another'}</button></div><LeadDebugCard lead={done.lead} lang={lang}/></div>

  return <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
    <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-7">
      <StepTitle n="1" title={lang === 'zh' ? '你要清什么？' : 'What do you need removed?'} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{requestCategories.map(o => <ChoiceCard key={o.id} selected={categories.includes(o.id)} onClick={() => setCategories(toggleValue(categories, o.id))} title={`${o.icon} ${o[lang]}`} />)}</div>

      <StepTitle n="2" title={lang === 'zh' ? '大概多少？' : 'How much is there?'} className="mt-8" />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">{amountOptions.map(o => <ChoiceCard key={o.id} selected={amount === o.id} onClick={() => setAmount(o.id as Lead['rough_amount'])} title={o[lang]} />)}</div>

      <StepTitle n="3" title={lang === 'zh' ? '东西在哪里？' : 'Where is it?'} className="mt-8" />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">{locationOptions.map(o => <ChoiceCard key={o.id} selected={location === o.id} onClick={() => setLocation(o.id as Lead['item_location'])} title={o[lang]} />)}</div>

      <StepTitle n="4" title={lang === 'zh' ? '特殊物品' : 'Special items'} className="mt-8" />
      <p className="mt-2 text-sm leading-6 text-slate-600">{lang === 'zh' ? '这些会影响是否自动分发。危险物品不会作为普通清运单发送。' : 'These affect dispatch eligibility. Hazardous items are not sent as regular junk removal leads.'}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{regularSpecialItems.map(o => <ChoiceCard key={o.id} selected={regular.includes(o.id)} onClick={() => setRegular(toggleValue(regular, o.id))} title={o[lang]} />)}</div>
      <div className="mt-5 rounded-[1.5rem] bg-red-50 p-4 ring-1 ring-red-100"><b className="text-red-950">{lang === 'zh' ? '危险/受限物品' : 'Hazardous / restricted items'}</b><div className="mt-3 grid gap-2 sm:grid-cols-2">{blockedItems.map(o => <ChoiceCard key={o.id} danger selected={blocked.includes(o.id)} onClick={() => setBlocked(toggleValue(blocked, o.id))} title={o[lang]} />)}</div>{blocked.length > 0 && <p className="mt-4 text-sm leading-6 text-red-900"><AlertTriangle className="mr-2 inline" size={16}/>{lang === 'zh' ? '这些物品可能需要 City of Calgary 特殊处理，不会作为普通清运单自动分发。' : 'These items may require City of Calgary special disposal and will not be auto-dispatched as a regular junk lead.'}</p>}</div>

      <StepTitle n="5" title={lang === 'zh' ? '联系方式' : 'Contact'} className="mt-8" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Input label={lang === 'zh' ? '姓名' : 'Name'} value={contact.name} setValue={v => setContact({ ...contact, name: v })}/>
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
          <PhoneInput
            label={lang === 'zh' ? '电话' : 'Phone'}
            value={contact.phone}
            setValue={v => {
              setContact({ ...contact, phone: v })
              setPhoneVerified(false)
              setOtpSentAt('')
              setOtpCode('')
              setOtpMessage('')
            }}
            help={lang === 'zh' ? '国家码 +1 已固定。提交前必须短信验证。' : 'Country code +1 is fixed. SMS verification is required before submitting.'}
          />
          <div className="mt-3 grid gap-2">
            <button
              type="button"
              onClick={sendPhoneCode}
              disabled={otpBusy}
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {otpBusy ? (lang === 'zh' ? '处理中…' : 'Working…') : (otpSentAt ? (lang === 'zh' ? '重新发送验证码' : 'Resend code') : (lang === 'zh' ? '发送验证码' : 'Send code'))}
            </button>
            <input
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              inputMode="numeric"
              placeholder={lang === 'zh' ? '输入验证码' : 'Enter code'}
              className="w-full rounded-full border border-black/10 px-4 py-2 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-700/10"
            />
            <button
              type="button"
              onClick={verifyPhoneCode}
              disabled={otpBusy || !otpCode.trim()}
              className="rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {lang === 'zh' ? '验证' : 'Verify'}
            </button>
          </div>
          <p className={`mt-2 text-xs font-semibold ${phoneVerified ? 'text-green-700' : 'text-slate-500'}`}>
            {phoneVerified
              ? (lang === 'zh' ? '✓ 电话号码已验证' : '✓ Phone number verified')
              : (otpMessage || (lang === 'zh' ? '我们只用验证码确认这是你的手机号。' : 'We use the code only to confirm this phone number.'))}
          </p>
        </div>
        <Input label="Email" value={contact.email} setValue={v => setContact({ ...contact, email: v })}/>
        <Select label={lang === 'zh' ? '社区' : 'Community'} value={communitySlug} setValue={chooseCommunity} options={communitySelectOptions} lang={lang}/>
        {communitySlug === 'other' && <Input label={lang === 'zh' ? '社区 / 邮编（如果不在列表）' : 'Community / postal code (if not listed)'} value={contact.community} setValue={v => setContact({ ...contact, community: v, area: normalizeDispatchArea('', v) })}/>}
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <b className="block text-slate-950">{lang === 'zh' ? '系统匹配区域' : 'Matching area'}</b>
          {areaName(contact.area, lang)}
          <p className="mt-1 text-xs">{lang === 'zh' ? '社区页进入时会自动带入社区；派单按 Calgary 大区匹配，不做社区硬匹配。' : 'Community pages pre-fill this field. Dispatch matches by Calgary area, not hard community boundaries.'}</p>
        </div>
        <Select label={lang === 'zh' ? '时间' : 'Timing'} value={timing} setValue={v => setTiming(v as Lead['timing'])} options={[{ id: 'today', en: 'Today', zh: '今天' }, { id: 'tomorrow', en: 'Tomorrow', zh: '明天' }, { id: 'this_week', en: 'This week', zh: '本周' }, { id: 'flexible', en: 'Flexible', zh: '时间灵活' }]} lang={lang}/>
      </div>
      <label className="mt-5 block">
        <span className="mb-2 block text-sm font-semibold">{lang === 'zh' ? '需求描述' : 'Description'}</span>
        <textarea
          value={contact.description}
          maxLength={CUSTOMER_DESCRIPTION_MAX}
          onChange={e => setContact({ ...contact, description: e.target.value })}
          placeholder={lang === 'zh' ? '例如：车库里有沙发和床垫，容易搬，希望周末清走。' : 'Example: Sofa and mattress in garage, easy access, prefer this weekend.'}
          className="min-h-[120px] w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-700/10"
        />
        <span className="mt-1 block text-right text-xs font-semibold text-slate-400">{contact.description.length}/{CUSTOMER_DESCRIPTION_MAX}</span>
      </label>
      <label className="mt-5 flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-black/20 bg-slate-50 p-5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
        <Camera size={18}/>
        {photoBusy
          ? (lang === 'zh' ? '正在压缩照片…' : 'Compressing photos…')
          : (lang === 'zh' ? `添加照片（可选，已选 ${leadPhotos.length}/2）` : `Add photos (optional, ${leadPhotos.length}/2 selected)`)}
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => {
            photoHandler(e.target.files)
            e.currentTarget.value = ''
          }}
        />
      </label>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        {lang === 'zh'
          ? '可分次添加，最多 2 张；每张原图最大 5MB；浏览器会先压缩，云端只保存压缩图，默认 30 天后删除。'
          : 'You can add photos one at a time, up to 2 total. Original image max 5MB; your browser compresses it first. Only compressed photos are stored and removed after 30 days by default.'}
      </p>
      {photoError && <p className="mt-2 text-xs font-semibold text-red-700">{photoError}</p>}
      {leadPhotos.length > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {leadPhotos.map((photo, i) => (
            <div key={`${photo.file_name}-${i}`} className="relative overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-black/10">
              <button
                type="button"
                onClick={() => removeLeadPhoto(i)}
                className="absolute right-2 top-2 z-10 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-red-700 shadow-sm ring-1 ring-black/10 hover:bg-red-50"
              >
                {lang === 'zh' ? '删除' : 'Remove'}
              </button>
              <img src={photo.preview_url} alt={photo.file_name} className="h-40 w-full bg-slate-100 object-contain"/>
              <div className="p-3 text-xs font-semibold text-slate-500">
                {formatBytes(photo.file_size)} · {photo.width}×{photo.height}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"><label className="flex gap-3"><input type="checkbox" checked={real} onChange={e => setReal(e.target.checked)} className="mt-1"/><span>{lang === 'zh' ? '我确认这是一个真实清运需求。' : 'I confirm this is a real junk removal request.'}</span></label><label className="flex gap-3"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1"/><span>{lang === 'zh' ? '我同意验证我的电话号码，并允许 Clearout YYC 将我的需求和联系方式分享给最多 3 个本地清运服务商。' : 'I agree to verify my phone number and allow Clearout YYC to share my request and contact details with up to 3 local junk removal providers.'}</span></label></div>
    <ManualCaptchaBox lang={lang} captcha={manualCaptcha} />
      {error && <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</div>}
      <button onClick={submit} disabled={submitting || !phoneVerified} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-700 px-6 py-4 text-base font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">{submitting ? (lang === 'zh' ? '提交中…' : 'Submitting…') : (phoneVerified ? (lang === 'zh' ? '提交免费需求' : 'Submit Free Request') : (lang === 'zh' ? '请先验证手机' : 'Verify phone first'))}<ArrowRight size={18}/></button>
    </div>
    <div className="space-y-5"><LeadGradeCard lang={lang} grade={classification.grade} fee={classification.fee} eligible={classification.eligible} risks={classification.riskFlags} /><div className="rounded-[2rem] bg-slate-950 p-6 text-white"><h3 className="text-2xl font-semibold">{lang === 'zh' ? '提交前请了解' : 'Before you submit'}</h3><div className="mt-4 grid gap-3 text-sm leading-6 text-slate-300"><p>✔ {lang === 'zh' ? 'Clearout YYC 是清运需求分发平台，不是清运公司。' : 'Clearout YYC is a junk removal request platform, not a junk removal company.'}</p><p>✔ {lang === 'zh' ? '你的需求最多发送给 3 个本地清运服务商。' : 'Your request may be shared with up to 3 local junk removal providers.'}</p><p>✔ {lang === 'zh' ? '你提交需求是免费的。' : 'Submitting a request is free.'}</p><p>✔ {lang === 'zh' ? '最终价格、时间、付款和服务由你和服务商直接确认。' : 'Final price, timing, payment, and service details are confirmed directly with the provider.'}</p></div></div></div>
  </div>
}

function LeadGradeCard({ lang, grade, fee, eligible, risks }: { lang: Lang; grade: Lead['lead_grade']; fee: number; eligible: boolean; risks: string[] }) {
  const safeTitle = lang === 'zh' ? '提交后会发生什么？' : 'What happens after you submit?'
  const eligibleText = lang === 'zh'
    ? '你的需求会先完成电话验证，然后最多发送给 3 个本地清运服务商。服务商可能直接联系你确认价格、时间和服务细节。'
    : 'Your request is phone-verified first, then may be shared with up to 3 local junk removal providers. Providers may contact you directly to confirm price, timing, and service details.'
  const blockedText = lang === 'zh'
    ? '你选择的物品可能需要特殊处理，因此不会作为普通清运需求自动发送。你仍然可以提交信息，我们会在页面中提示需要确认。'
    : 'Some selected items may require special disposal, so this will not be auto-dispatched as a regular junk removal request. You can still submit the information for confirmation.'
  return <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-700">{lang === 'zh' ? '下一步' : 'Next step'}</p><h3 className="mt-3 text-3xl font-semibold">{safeTitle}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{eligible ? eligibleText : blockedText}</p><div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"><b>{lang === 'zh' ? '你的隐私和体验' : 'Your privacy and experience'}</b><p className="mt-1">{lang === 'zh' ? '不会群发。不会把你的需求发送给超过 3 个服务商。Clearout YYC 不直接提供清运服务，也不强制你成交。' : 'No blasting. We do not send your request to more than 3 providers. Clearout YYC does not provide removal services directly and does not require you to book.'}</p></div>{risks.length > 0 && <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900"><b>{lang === 'zh' ? '可能需要特殊处理' : 'May require special handling'}</b><div className="mt-2 flex flex-wrap gap-2">{risks.map(r => <span key={r} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">{r}</span>)}</div></div>}</div>
}

function ProviderPage({ lang }: { lang: Lang }) {
  const cards = lang === 'zh'
    ? [['无 App', '不用下载 App，不用维护复杂后台。'], ['短信接单', '附近清运需求可通过短信/邮件提醒。'], ['Beta 免费', '测试阶段免费接收电话已验证需求。']]
    : [['No app', 'No app to download and no complex dashboard.'], ['SMS leads', 'Nearby junk removal requests by SMS/email.'], ['Free beta', 'Receive phone-verified requests free during beta.']]
  return <main>
    <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
      <div className="grid gap-6 overflow-hidden rounded-[2.2rem] bg-slate-950 p-6 text-white shadow-sm sm:p-8 lg:grid-cols-[1.05fr_.95fr] lg:p-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-200">{lang === 'zh' ? '服务商 Beta' : 'Provider beta'}</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{lang === 'zh' ? '不用 App，直接接收 Calgary 清运线索。' : 'No app. Just Calgary junk removal lead alerts.'}</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">{lang === 'zh' ? '加入免费 Beta 名单。选择你愿意服务的大区、车辆能力和清运类型；符合条件、已确认的需求可通过短信/邮件提醒你。' : 'Join the free beta list. Choose your service areas, vehicle capacity, and job types; matching confirmed requests can be sent by SMS/email.'}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row"><a href="#provider-form" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 font-semibold text-slate-950 hover:bg-red-50">{lang === 'zh' ? '加入免费 Beta' : 'Join free beta'}<ArrowRight size={18}/></a><a href="/api/provider/unsubscribe" className="inline-flex items-center justify-center rounded-full bg-white/10 px-7 py-4 font-semibold text-white ring-1 ring-white/10 hover:bg-white/15">{lang === 'zh' ? '管理邮件通知' : 'Manage email preferences'}</a><button onClick={() => go('/faq')} className="rounded-full bg-white/10 px-7 py-4 font-semibold text-white ring-1 ring-white/10 hover:bg-white/15">FAQ</button></div>
        </div>
        <div className="grid gap-3">
          {cards.map(([title, body]) => <div key={title} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10"><b>{title}</b><p className="mt-2 text-sm leading-6 text-slate-300">{body}</p></div>)}
        </div>
      </div>
    </section>
    <section className="mx-auto max-w-6xl px-5 pb-2 sm:px-8 lg:px-10">
      <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">{lang === 'zh' ? '已经申请过服务商？' : 'Already applied as a provider?'}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{lang === 'zh' ? '输入你的服务商邮箱，即可获取安全链接来开启、关闭或管理 Clearout YYC 线索邮件。' : 'Enter your provider email to receive a secure link for turning Clearout YYC lead emails on or off.'}</p>
          </div>
          <a href="/api/provider/unsubscribe" className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800">{lang === 'zh' ? '管理邮件通知' : 'Manage email preferences'}</a>
        </div>
      </div>
    </section>
    <section id="provider-form" className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-10"><ProviderForm lang={lang}/></section>
  </main>
}

function ProviderForm({ lang }: { lang: Lang }) {
  const [form, setForm] = useState({ name: '', contact: '', phone: '', email: '', description: '', crew: 'one' as ProviderApplication['crew_capacity'], daily: 3 })
  const [areas, setAreas] = useState<Area[]>(['all_calgary'])
  const [services, setServices] = useState<string[]>(['mattress_bed', 'furniture_household'])
  const [vehicles, setVehicles] = useState<string[]>(['pickup'])
  const [smsConsent, setSmsConsent] = useState(false)
  const [legal, setLegal] = useState(false)
  const [dumping, setDumping] = useState(false)
  const [terms, setTerms] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const manualCaptcha = useManualCaptcha()

  async function submit() {
    setError('')
    if (submitting) return
    if (!form.name.trim() || !form.contact.trim() || !form.phone.trim() || !form.email.trim()) { setError(lang === 'zh' ? '请填写名称、联系人、电话和邮箱。' : 'Please enter business name, contact name, phone, and email.'); return }

    const normalizedProviderPhone = normalizeNorthAmericanPhone(form.phone)
    if (!normalizedProviderPhone) { setError(lang === 'zh' ? '请输入有效的 10 位服务商联系电话，例如 403-555-1234。' : 'Please enter a valid 10-digit business phone number, such as 403-555-1234.'); return }

    const normalizedProviderEmail = normalizeEmail(form.email)
    if (!normalizedProviderEmail) { setError(lang === 'zh' ? '请输入有效的服务商邮箱地址。' : 'Please enter a valid business email address.'); return }
    const businessDescription = form.description.trim()
    if (businessDescription.length > PROVIDER_DESCRIPTION_MAX) { setError(lang === 'zh' ? `服务商介绍最多 ${PROVIDER_DESCRIPTION_MAX} 个字符。` : `Business introduction must be ${PROVIDER_DESCRIPTION_MAX} characters or less.`); return }

    if (!areas.length || !services.length || !vehicles.length) { setError(lang === 'zh' ? '请选择服务区域、可接服务和车辆能力。' : 'Choose service areas, services, and vehicle capability.'); return }
    if (!smsConsent || !legal || !dumping || !terms) { setError(lang === 'zh' ? '请确认线索通知同意、合法经营、不非法倾倒和条款。' : 'Please confirm lead notification consent, legal operation, no illegal dumping, and terms.'); return }
    if (!isManualCaptchaReady(manualCaptcha)) { setError(lang === 'zh' ? '请输入人工验证码答案。' : 'Please enter the manual verification answer.'); return }
    const maxLevel = Math.max(...vehicles.map(v => vehicleOptions.find(x => x.id === v)?.level || 1))
    const row: ProviderApplication = {
      application_id: uid('provider'), created_at: new Date().toISOString(), approval_status: 'submitted', active: true, beta_opt_in: true, verified: false, last_assigned_at: null,
      provider_display_name: form.name.trim(), contact_name: form.contact.trim(), phone: normalizedProviderPhone, email: normalizedProviderEmail, business_description: businessDescription, service_areas: normalizeProviderDispatchAreas(areas), services_accepted: normalizeProviderServiceTypes(services), vehicle_capabilities: vehicles, max_vehicle_level: maxLevel, crew_capacity: form.crew,
      accepts_sms_leads: smsConsent, accepts_email_leads: true, sms_consent_confirmed: smsConsent, preferred_notification: 'sms', daily_lead_limit: form.daily, available_days: [], available_time_windows: [], accepts_same_day: 'depends', refund_or_bad_number_policy_seen: true,
      provider_type: 'not_sure', legal_owner_name: '', corporation_legal_name: '', registered_trade_name: '', business_number_bn: '', gst_hst_account: '', city_business_id: '', alberta_registration_proof: null,
      general_liability_status: 'not_sure', commercial_auto_status: 'not_sure', insurance_company: '', policy_number: '', insurance_expiry: '', general_liability_proof: null, commercial_auto_proof: null,
      uses_helpers: 'not_sure', wcb_status: 'not_sure', wcb_proof: null, special_item_capabilities: [], condo_jobs: 'depends_loading_zone', legal_operation_confirmed: legal, no_illegal_dumping_confirmed: dumping, independent_provider_confirmed: true, terms_confirmed: terms,
    }

    try {
      setSubmitting(true)
      if (isRemoteApiEnabled()) {
        await postRemoteJson<{ ok?: boolean }>('/api/provider-applications', {
          application: row,
          source: 'clearout_yyc_provider_beta_form',
          source_url: window.location.href,
          manualCaptcha: manualCaptchaPayload(manualCaptcha),
        })
      }
      saveList<ProviderApplication>('clearout_providers', row)
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : (lang === 'zh' ? '提交失败，请稍后再试。' : 'Submission failed. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (done) return <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-black/5"><CheckCircle2 className="text-green-700" size={36}/><h2 className="mt-4 text-3xl font-semibold">{lang === 'zh' ? '已加入 Beta 名单' : 'You are on the beta list'}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{lang === 'zh' ? '申请已提交。我们已经收到你的服务商申请。审核通过后，你会先收到邮件通知，然后才可能收到客户线索提醒。Beta 阶段不会收月费，也不需要下载 App。' : 'Application submitted. We received your provider application. If approved, you will receive an email notification before receiving customer lead alerts. During beta there is no monthly fee and no app.'}</p><button onClick={() => setDone(false)} className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white">{lang === 'zh' ? '继续编辑' : 'Add another'}</button></div>

  return <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]"><div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-7"><h2 className="text-3xl font-semibold">{lang === 'zh' ? '快速加入' : 'Quick opt-in'}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{lang === 'zh' ? '免费 Beta 阶段。未来如有付费查看联系方式，付款前会清楚显示规则。' : 'Free beta. If paid contact access is introduced later, terms will be shown clearly before access.'}</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><Input label={lang === 'zh' ? '商户/个人名称' : 'Business or provider name'} value={form.name} setValue={v => setForm({ ...form, name: v })}/><Input label={lang === 'zh' ? '联系人' : 'Contact name'} value={form.contact} setValue={v => setForm({ ...form, contact: v })}/><PhoneInput
                    label={lang === 'zh' ? '电话' : 'Phone'}
                    value={form.phone}
                    setValue={v => setForm({ ...form, phone: v })}
                    help={lang === 'zh' ? '国家码 +1 已固定。请输入后面 10 位号码，例如 403-555-1234。' : 'Country code +1 is fixed. Enter the 10-digit number, for example 403-555-1234.'}
                  /><Input label="Email" value={form.email} setValue={v => setForm({ ...form, email: v })}/></div>
    <label className="mt-4 block">
      <span className="mb-2 block text-sm font-semibold">{lang === 'zh' ? '服务商介绍（可选）' : 'Business introduction (optional)'}</span>
      <textarea
        value={form.description}
        maxLength={PROVIDER_DESCRIPTION_MAX}
        onChange={e => setForm({ ...form, description: e.target.value })}
        placeholder={lang === 'zh' ? '例如：本地清运团队，可做家具、床垫、车库清理和退租清理。' : 'Example: Local junk removal crew for furniture, mattresses, garage cleanouts, and move-out clearouts.'}
        className="min-h-[96px] w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-700/10"
      />
      <span className="mt-1 block text-right text-xs font-semibold text-slate-400">{form.description.length}/{PROVIDER_DESCRIPTION_MAX}</span>
    </label>
    <MultiSelect title={lang === 'zh' ? '服务区域' : 'Service areas'} options={providerAreaOptions as any} selected={areas} setSelected={v => setAreas(v as Area[])} lang={lang}/>
    <MultiSelect title={lang === 'zh' ? '可接清运类型' : 'Accepted job types'} options={providerServiceOptions} selected={services} setSelected={setServices} lang={lang}/>
    <MultiSelect title={lang === 'zh' ? '车辆能力' : 'Vehicle capability'} options={vehicleOptions} selected={vehicles} setSelected={setVehicles} lang={lang}/>
    <div className="mt-6 grid gap-4 sm:grid-cols-2"><Select label={lang === 'zh' ? '人手能力' : 'Crew size'} value={form.crew} setValue={v => setForm({ ...form, crew: v as ProviderApplication['crew_capacity'] })} options={[{ id:'one', en:'1 person', zh:'1人' }, { id:'two', en:'2 people', zh:'2人' }, { id:'three_plus', en:'3+ people', zh:'3人以上' }]} lang={lang}/><Select label={lang === 'zh' ? '每日线索上限' : 'Daily lead limit'} value={String(form.daily)} setValue={v => setForm({ ...form, daily: Number(v) })} options={[{ id:'1', en:'1', zh:'1' }, { id:'3', en:'3', zh:'3' }, { id:'5', en:'5', zh:'5' }, { id:'20', en:'No limit beta', zh:'Beta 不限' }]} lang={lang}/></div>
    <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"><label className="flex gap-3"><input type="checkbox" checked={smsConsent} onChange={e => setSmsConsent(e.target.checked)} className="mt-1"/><span>{lang === 'zh' ? '我同意 Clearout YYC 通过电话、邮件或未来短信向我发送清运线索通知；短信可随时 STOP 退订。' : 'I agree Clearout YYC may send lead notifications by phone, email, or future SMS. SMS can be stopped anytime.'}</span></label><label className="flex gap-3"><input type="checkbox" checked={legal} onChange={e => setLegal(e.target.checked)} className="mt-1"/><span>{lang === 'zh' ? '我确认本人/本业务有权在 Alberta 提供有偿清运服务，并自行负责保险、车辆、税务和处置规则。' : 'I confirm I am allowed to provide paid junk removal services in Alberta and am responsible for insurance, vehicle, tax, and disposal rules.'}</span></label><label className="flex gap-3"><input type="checkbox" checked={dumping} onChange={e => setDumping(e.target.checked)} className="mt-1"/><span>{lang === 'zh' ? '我同意不会非法倾倒、遗弃或不当处理客户物品。' : 'I agree not to illegally dump, abandon, or improperly dispose of customer items.'}</span></label><label className="flex gap-3"><input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} className="mt-1"/><span>{lang === 'zh' ? '我理解 Clearout YYC 是线索分发平台，不是清运公司、雇主或服务担保方；Beta 结束后的任何付费规则会在查看联系方式前显示。' : 'I understand Clearout YYC is a lead distribution platform, not a junk removal company, employer, or service guarantor; any future paid access rules will be shown before contact access.'}</span></label></div>
    <ManualCaptchaBox lang={lang} captcha={manualCaptcha} />
      {error && <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</div>}<button onClick={submit} className="mt-6 rounded-full bg-red-700 px-6 py-3 text-sm font-semibold text-white hover:bg-red-800">{submitting ? (lang === 'zh' ? '提交中…' : 'Submitting…') : (lang === 'zh' ? '加入免费 Beta 名单' : 'Join Free Beta List')}</button></div>
    <div className="space-y-5"><div className="rounded-[2rem] bg-slate-950 p-6 text-white"><h3 className="text-2xl font-semibold">{lang === 'zh' ? '服务商规则' : 'Provider rules'}</h3><div className="mt-5 grid gap-3 text-sm leading-6 text-slate-300"><p>✔ {lang === 'zh' ? '先确认电话：客户需求在分享前会先确认手机号。' : 'Phone confirmation: customer phone is confirmed before dispatch.'}</p><p>✔ {lang === 'zh' ? 'Beta 免费：测试阶段免费接收客户电话。' : 'Free beta: receive customer contact free during testing.'}</p><p>✔ {lang === 'zh' ? '无 App、无月费、无登录后台。' : 'No app, no monthly fee, no dashboard login.'}</p><p>✔ {lang === 'zh' ? '未来如启用付费，查看联系方式前会清楚显示规则。' : 'If paid access is enabled later, terms are shown before contact release.'}</p></div></div><div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5"><h3 className="text-xl font-semibold">{lang === 'zh' ? '未来付费原则' : 'Future paid access principles'}</h3><div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700"><p><b>{lang === 'zh' ? 'Beta 期间免费：' : 'Free during beta:'}</b> {lang === 'zh' ? '当前阶段先验证客户需求和服务商响应。' : 'This stage is for testing customer demand and provider response.'}</p><p><b>{lang === 'zh' ? '以后按需付费：' : 'Pay only if you choose:'}</b> {lang === 'zh' ? '如果未来开启付费，只有当你选择查看客户联系方式时才可能付费，无月费、无隐藏订阅。' : 'If paid access is enabled later, you may pay only when you choose to view a customer contact. No monthly fee or hidden subscription.'}</p><p><b>{lang === 'zh' ? '查看前明示：' : 'Shown before access:'}</b> {lang === 'zh' ? '共享/独家、已售人数、价格和退款/credit 规则会在查看联系方式前显示。' : 'Shared/exclusive status, sold count, price, and refund/credit rules will be shown before contact access.'}</p></div></div><div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5"><h3 className="text-xl font-semibold">{lang === 'zh' ? '未来审核资料' : 'Future verification'}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{lang === 'zh' ? '正式收费或 Verified 标识上线前，可补充商业保险、BN、Business ID、WCB 等文件。字段已在数据模型中保留。' : 'Before paid mode or verified badge, providers can add insurance, BN, Business ID, WCB, and other documents. Fields are already reserved in the data model.'}</p></div></div></div>
}


function LeadPhotoGallery({ lang, photos }: { lang: Lang; photos?: LeadPhotoView[] }) {
  const active = (photos || []).filter(p => p.active !== false && p.signed_url)

  if (!active.length) {
    return <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
      <b className="text-slate-950">{lang === 'zh' ? '照片' : 'Photos'}</b>
      <p className="mt-1">{lang === 'zh' ? '客户没有上传照片，或照片已过期。' : 'No photos were uploaded, or the photos have expired.'}</p>
    </div>
  }

  return <div className="mt-5 rounded-2xl bg-slate-50 p-4">
    <div className="flex items-center justify-between gap-3">
      <b className="text-sm text-slate-950">{lang === 'zh' ? '客户照片' : 'Customer photos'}</b>
      <span className="text-xs font-semibold text-slate-500">{active.length} / 2</span>
    </div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {active.map((photo, i) => <a key={photo.public_id || i} href={photo.signed_url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl bg-white ring-1 ring-black/10 hover:ring-red-700/30">
        <img src={photo.signed_url} alt={photo.file_name || `Lead photo ${i + 1}`} className="h-52 w-full object-contain" loading="lazy" />
        <div className="p-3 text-xs font-semibold text-slate-500">{formatBytes(photo.file_size)} · {photo.width || '—'}×{photo.height || '—'}</div>
      </a>)}
    </div>
    <p className="mt-3 text-xs leading-5 text-slate-500">{lang === 'zh' ? '照片链接为临时访问链接，默认 30 天后云端删除。' : 'Photo links are temporary; uploaded photos are removed from cloud storage after 30 days by default.'}</p>
  </div>
}

type ProviderLeadPreviewResult = {
  ok?: boolean
  lead?: {
    public_id: string
    status: string
    community_slug?: string
    community_or_postal?: string
    area?: string
    service_type?: string
    job_size?: string
    timeline?: string
    notes_preview?: string
    shared_claim_count?: number
    shared_limit?: number
    expires_at?: string
    created_at?: string
    already_claimed_by_you?: boolean
    exclusive_available?: boolean
    shared_available?: boolean
    photo_count?: number
    photos?: LeadPhotoView[]
  }
  message?: string
}

type ProviderClaimResult = {
  ok?: boolean
  access?: 'shared' | 'exclusive'
  message?: string
  lead_public_id?: string
  shared_claim_count?: number
  shared_limit?: number
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  community_or_postal?: string
  area?: string
  request_description?: string
  photo_count?: number
  photos?: LeadPhotoView[]
  customer?: {
    name?: string
    phone?: string
    email?: string
    community_or_postal?: string
    area?: string
    notes?: string
  }
}

function ProviderLeadClaimPage({ lang }: { lang: Lang }) {
  const params = new URLSearchParams(window.location.search)
  const lead = params.get('lead') || ''
  const token = params.get('token') || ''
  const [preview, setPreview] = useState<ProviderLeadPreviewResult | null>(null)
  const [claim, setClaim] = useState<ProviderClaimResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<'shared' | 'exclusive' | ''>('')
  const [error, setError] = useState('')

  async function loadPreview() {
    setError('')
    setClaim(null)
    if (!lead || !token) {
      setError(lang === 'zh' ? '缺少 lead 或 token。' : 'Missing lead or token.')
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/provider/lead-preview?lead=${encodeURIComponent(lead)}&token=${encodeURIComponent(token)}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || data?.result?.message || 'Could not load lead')
      setPreview(data.result)
      if (data?.result?.provider_already_claimed && data?.result?.customer) {
        setClaim({
          ok: true,
          access: data.result.claimed_access || data.result.access || 'shared',
          lead_public_id: lead,
          customer: data.result.customer,
        } as any)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function claimLead(access: 'shared' | 'exclusive') {
    setError('')
    setClaim(null)
    if (!lead || !token) return
    try {
      setClaiming(access)
      const response = await fetch(`${API_BASE_URL}/api/provider/claim-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_public_id: lead, token, access }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || data?.result?.message || 'Claim failed')
      setClaim(data.result)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setClaiming('')
    }
  }

  useEffect(() => { loadPreview() }, [])

  const leadData = preview?.lead
  const spotsLeft = Math.max(0, Number(leadData?.shared_limit || 3) - Number(leadData?.shared_claim_count || 0))

  const leadUnavailableNotice = (() => {
    if (!leadData || claim?.ok) return null

    const status = String(leadData.status || '')
    const sharedCount = Number(leadData.shared_claim_count || 0)
    const sharedLimit = Number(leadData.shared_limit || 3)

    if (leadData.already_claimed_by_you) {
      return {
        title: lang === 'zh' ? '你已经认领过这个需求' : 'You have already claimed this lead',
        body: lang === 'zh'
          ? '客户联系方式显示在下方。你可以保存此链接，之后再次打开仍可查看。'
          : 'Customer contact details are shown below. You can save this link and reopen it later.'
      }
    }

    if (status === 'exclusive_claimed') {
      return {
        title: lang === 'zh' ? '这个需求已被独家认领' : 'This lead has already been claimed exclusively',
        body: lang === 'zh'
          ? '该需求已被其他服务商独家认领，当前不再开放认领。请查看下一个可用需求。'
          : 'This lead has already been claimed exclusively by another provider. It is no longer available. Please check the next available lead.'
      }
    }

    if (status === 'shared_full' || sharedCount >= sharedLimit) {
      return {
        title: lang === 'zh' ? '这个需求的共享名额已满' : 'The shared limit has been reached',
        body: lang === 'zh'
          ? '该需求已经达到最多共享服务商数量，当前不再开放认领。请查看下一个可用需求。'
          : 'This lead has already been shared with the maximum number of providers. It is no longer available. Please check the next available lead.'
      }
    }

    if (status === 'expired') {
      return {
        title: lang === 'zh' ? '这个需求已经过期' : 'This lead has expired',
        body: lang === 'zh'
          ? '该需求已过有效期，不能再认领。'
          : 'This lead has expired and is no longer available.'
      }
    }

    if (status === 'queued') {
      return {
        title: lang === 'zh' ? '这个需求暂未发布' : 'This lead is not available yet',
        body: lang === 'zh'
          ? '该需求还在等待发布。新需求会在服务商通知时间内开放。'
          : 'This lead is waiting to be released. New leads are made available during provider alert hours.'
      }
    }

    if (!leadData.shared_available && !leadData.exclusive_available) {
      return {
        title: lang === 'zh' ? '这个需求当前不可认领' : 'This lead is currently unavailable',
        body: lang === 'zh'
          ? '当前状态不允许认领。请查看下一个可用需求。'
          : 'This lead is not available for claiming right now. Please check the next available lead.'
      }
    }

    return null
  })()

  return <main>
    <PageHero
      eyebrow={lang === 'zh' ? '服务商抢单链接' : 'Provider claim link'}
      title={lang === 'zh' ? 'Clearout YYC Beta 认领' : 'Clearout YYC Beta Claim'}
      text={lang === 'zh' ? '先看需求概要。认领成功后才显示客户联系方式。Beta 阶段免费。' : 'Review the lead summary first. Customer contact details are shown only after a successful claim. Beta access is free.'}
    />
    <section className="mx-auto max-w-4xl px-5 py-12 sm:px-8 lg:px-10">
      {loading && <div className="rounded-[2rem] bg-white p-7 text-sm text-slate-600 shadow-sm ring-1 ring-black/5">{lang === 'zh' ? '正在加载需求…' : 'Loading lead…'}</div>}
      {error && <div className="rounded-[2rem] bg-red-50 p-7 text-sm font-semibold text-red-900 shadow-sm ring-1 ring-red-200">{error}</div>}

      {!loading && leadData && <div className="rounded-[2rem] bg-white p-7 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{leadData.community_or_postal || 'Calgary'}</span>
          <span className="rounded-full bg-red-50 px-3 py-1 text-red-800">{leadData.status}</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">{spotsLeft} {lang === 'zh' ? '个 shared 名额' : 'shared spots left'}</span>
        </div>
        <h2 className="mt-5 text-3xl font-semibold tracking-tight">{leadData.service_type || 'Junk removal'} · {leadData.job_size || 'not sure'}</h2>
        <div className="mt-5 grid gap-3 text-sm leading-6 text-slate-700 sm:grid-cols-2">
          <p><b>{lang === 'zh' ? '区域' : 'Area'}:</b> {leadData.area || 'Calgary'}</p>
          <p><b>{lang === 'zh' ? '时间' : 'Timing'}:</b> {leadData.timeline || 'not specified'}</p>
          <p><b>{lang === 'zh' ? 'Shared' : 'Shared'}:</b> {leadData.shared_claim_count || 0} / {leadData.shared_limit || 3}</p>
          <p><b>{lang === 'zh' ? '过期' : 'Expires'}:</b> {leadData.expires_at ? new Date(leadData.expires_at).toLocaleString() : '—'}</p>
        </div>
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          <b>{lang === 'zh' ? '客户备注预览' : 'Customer notes preview'}</b>
          <p className="mt-2">{leadData.notes_preview || (lang === 'zh' ? '无备注。' : 'No notes provided.')}</p>
        </div>
        <LeadPhotoGallery lang={lang} photos={leadData.photos} />
        <p className="mt-5 text-sm leading-6 text-slate-500">{lang === 'zh' ? '认领前不显示客户电话、邮箱或完整联系方式。认领成功后，你直接联系客户报价和安排服务。Clearout YYC 不提供电话派单。' : 'Customer phone, email, and full contact details are hidden until claim. After claiming, contact the customer directly to quote and arrange service. Clearout YYC does not provide phone dispatch.'}</p>

        {leadUnavailableNotice && <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950 ring-1 ring-amber-200">
          <b>{leadUnavailableNotice.title}</b>
          <p className="mt-1">{leadUnavailableNotice.body}</p>
        </div>}

        <div className={`mt-7 grid gap-3 ${leadData.exclusive_available ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}>
          <button disabled={!leadData.shared_available || Boolean(claiming)} onClick={() => claimLead('shared')} className="rounded-full bg-red-700 px-6 py-3 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600">
            {claiming === 'shared' ? (lang === 'zh' ? '认领中…' : 'Claiming…') : (lang === 'zh' ? '免费 Shared 认领' : 'Claim Shared Free')}
          </button>
          {leadData.exclusive_available && <button disabled={Boolean(claiming)} onClick={() => claimLead('exclusive')} className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600">
            {claiming === 'exclusive' ? (lang === 'zh' ? '认领中…' : 'Claiming…') : (lang === 'zh' ? '免费 Exclusive 认领' : 'Claim Exclusive Free')}
          </button>}
        </div>
      </div>}

      {claim?.ok && <div className="mt-6 rounded-[2rem] bg-emerald-50 p-7 shadow-sm ring-1 ring-emerald-200">
        <CheckCircle2 className="text-emerald-700" size={36}/>
        <h2 className="mt-3 text-2xl font-semibold text-emerald-950">{lang === 'zh' ? '认领成功，客户联系方式已显示' : 'Claim successful — customer contact details released'}</h2>
        <div className="mt-5 grid gap-3 text-sm leading-6 text-emerald-950 sm:grid-cols-2">
          <p><b>{lang === 'zh' ? '认领类型' : 'Access'}:</b> {claim.access}</p>
          <p><b>{lang === 'zh' ? '位置' : 'Area'}:</b> {claim.customer?.community_or_postal || claim.community_or_postal || '—'}</p>
          <p><b>{lang === 'zh' ? '客户' : 'Customer'}:</b> {claim.customer?.name || claim.customer_name || '—'}</p>
          <p><b>{lang === 'zh' ? '电话' : 'Phone'}:</b> {claim.customer?.phone || claim.customer_phone || '—'}</p>
          <p><b>Email:</b> {claim.customer?.email || claim.customer_email || '—'}</p>
        </div>
        <p className="mt-4 text-sm leading-6 text-emerald-900">{claim.customer?.notes || claim.request_description || ''}</p>
        <LeadPhotoGallery lang={lang} photos={claim.photos || leadData?.photos} />
      </div>}
    </section>
  </main>
}


type ProviderLeadSummary = {
  lead_public_id: string
  community_or_postal: string
  area: string
  timing: string
  rough_amount: string
  item_location: string
  request_categories: string[]
  regular_special_items: string[]
  risk_flags: string[]
  lead_grade: string
  dispatch_summary: string
  photo_count: number
  shared_claim_count: number
  shared_claim_limit: number
  spots_left: number
  expires_at: string
  provider_already_claimed: boolean
}

function ProviderLeadsPage({ lang }: { lang: Lang }) {
  const urlToken = new URLSearchParams(window.location.search).get('token') || ''
  const [token, setToken] = useState(() => urlToken || localStorage.getItem('clearout_provider_token') || '')
  const [leads, setLeads] = useState<ProviderLeadSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [claimed, setClaimed] = useState<any>(null)

  async function loadLeads(nextToken = token) {
    setError('')
    setClaimed(null)
    if (!nextToken.trim()) { setError(lang === 'zh' ? '请输入服务商 token。' : 'Enter your provider token.'); return }
    try {
      setLoading(true)
      localStorage.setItem('clearout_provider_token', nextToken.trim())
      const response = await fetch(`${API_BASE_URL}/api/provider/available-leads?token=${encodeURIComponent(nextToken.trim())}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || 'Could not load leads')
      setLeads(data.leads || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function claimLead(lead_public_id: string) {
    setError('')
    setClaimed(null)
    try {
      const response = await fetch(`${API_BASE_URL}/api/provider/claim-free`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_public_id }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || data?.result?.message || 'Claim failed')
      await loadLeads(token)
      setClaimed(data.result)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => { if (urlToken) loadLeads(urlToken) }, [])

  return <main>
    <PageHero eyebrow={lang === 'zh' ? '服务商接单台' : 'Provider lead access'} title={lang === 'zh' ? 'Free Beta Claim' : 'Free Beta Claim'} text={lang === 'zh' ? '已审核服务商可用专属 token 查看可认领需求。前期免费；支付系统架构已预留但默认关闭。' : 'Approved providers can view and claim available leads with a private token. Beta is free; paid access plumbing is reserved but disabled by default.'}/>
    <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-10">
      <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="text-2xl font-semibold">{lang === 'zh' ? 'Provider Token' : 'Provider Token'}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{lang === 'zh' ? '这个 token 只发给通过人工审核的本地服务商。不要公开。' : 'This token is issued only to manually approved local providers. Do not share it publicly.'}</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input value={token} onChange={e => setToken(e.target.value)} placeholder="provider_xxx" className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-700/10" />
          <button onClick={() => loadLeads(token)} className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700">{loading ? (lang === 'zh' ? '加载中…' : 'Loading…') : (lang === 'zh' ? '查看可认领需求' : 'Load available leads')}</button>
        </div>
        {error && <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</div>}
      </div>

      {claimed && <div className="mt-6 rounded-[2rem] bg-emerald-50 p-6 shadow-sm ring-1 ring-emerald-200">
        <CheckCircle2 className="text-emerald-700" size={34}/>
        <h2 className="mt-3 text-2xl font-semibold text-emerald-950">{lang === 'zh' ? '认领成功，联系方式已释放' : 'Claim successful — contact details released'}</h2>
        <div className="mt-4 grid gap-2 text-sm leading-6 text-emerald-950 sm:grid-cols-2">
          <p><b>Lead:</b> {claimed.lead_public_id}</p>
          <p><b>{lang === 'zh' ? '位置' : 'Area'}:</b> {claimed.community_or_postal}</p>
          <p><b>{lang === 'zh' ? '客户' : 'Customer'}:</b> {claimed.customer_name}</p>
          <p><b>{lang === 'zh' ? '电话' : 'Phone'}:</b> {claimed.customer_phone}</p>
          <p><b>Email:</b> {claimed.customer_email || '—'}</p>
          <p><b>{lang === 'zh' ? '名额' : 'Claim position'}:</b> {claimed.claim_position} / {claimed.shared_claim_limit}</p>
        </div>
        <p className="mt-4 text-sm leading-6 text-emerald-900">{claimed.request_description}</p>
      </div>}

      <div className="mt-8 grid gap-4">
        {leads.length === 0 && !loading && <div className="rounded-[2rem] bg-white p-6 text-sm text-slate-600 shadow-sm ring-1 ring-black/5">{lang === 'zh' ? '暂无可认领需求，或 token 尚未加载。' : 'No available leads yet, or token has not been loaded.'}</div>}
        {leads.map(lead => <div key={lead.lead_public_id} className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em]"><span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{lead.community_or_postal}</span><span className="rounded-full bg-red-50 px-3 py-1 text-red-800">{lead.spots_left} {lang === 'zh' ? '个名额剩余' : 'spots left'}</span><span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">{lead.photo_count} photos</span></div>
              <h2 className="mt-3 text-2xl font-semibold">{lead.lead_grade || 'Lead'} · {lead.rough_amount}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{lead.dispatch_summary || `${lead.timing} · ${lead.item_location}`}</p>
              <p className="mt-3 text-xs text-slate-500">{lang === 'zh' ? '认领前不显示客户电话。认领后你直接联系客户报价和安排服务。' : 'Customer phone is hidden until claim. After claiming, contact the customer directly to quote and arrange service.'}</p>
              {lead.provider_already_claimed && <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-xs font-semibold leading-5 text-emerald-900 ring-1 ring-emerald-200">{lang === 'zh' ? '你已经认领过这个需求。客户联系方式会在认领结果中显示。' : 'You have already claimed this lead. Customer contact details are available in your claim result.'}</p>}
              {!lead.provider_already_claimed && lead.spots_left <= 0 && <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-950 ring-1 ring-amber-200">{lang === 'zh' ? '这个需求已经达到最多共享服务商数量，不能再认领。' : 'This lead has already reached the maximum number of shared providers and is no longer available.'}</p>}
            </div>
            <button disabled={lead.provider_already_claimed || lead.spots_left <= 0} onClick={() => claimLead(lead.lead_public_id)} className="rounded-full bg-red-700 px-6 py-3 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600">{lead.provider_already_claimed ? (lang === 'zh' ? '已认领' : 'Already claimed') : (lang === 'zh' ? '免费认领' : 'Claim Free')}</button>
          </div>
        </div>)}
      </div>
    </section>
  </main>
}

function ProviderCTA({ lang }: { lang: Lang }) { return <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-10"><div className="rounded-[2rem] bg-red-700 p-7 text-white shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-9"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-100">{lang === 'zh' ? '服务商' : 'Providers'}</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">{lang === 'zh' ? '免费接收已确认清运线索' : 'Receive confirmed junk removal leads for free'}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-red-50">{lang === 'zh' ? '无 App，无月费。只发给 opt-in 服务商。' : 'No app. No monthly fee. Sent only to opt-in providers.'}</p></div><button onClick={() => go('/providers')} className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 sm:mt-0">{lang === 'zh' ? '加入接单名单' : 'Join provider list'}</button></div></section> }


type AdminPlatformSettings = {
  customer_requests_enabled: boolean
  lead_dispatch_enabled: boolean
  provider_claims_enabled: boolean
  lead_dispatch_channel: 'email' | 'sms'
}

type AdminSettingKey = keyof AdminPlatformSettings

function AdminPage({ lang }: { lang: Lang }) {
  const [adminToken, setAdminToken] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('token') || localStorage.getItem('clearout_admin_token') || ''
    } catch {
      return ''
    }
  })
  const [settings, setSettings] = useState<AdminPlatformSettings | null>(null)
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string>('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const leads = getList<Lead>('clearout_leads')
  const providers = getList<ProviderApplication>('clearout_providers')
  const dispatches = getList<Dispatch>('clearout_dispatches')

  async function adminApi<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = adminToken.trim()
    const response = await fetch(`${API_BASE_URL}/api/admin${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token,
        ...(init.headers || {}),
      },
    })

    const text = await response.text()
    let data: any = null
    try { data = text ? JSON.parse(text) : null } catch { data = text }

    if (!response.ok) {
      throw new Error(data?.error || text || `Admin request failed: ${response.status}`)
    }

    return data as T
  }

  async function loadAdmin() {
    if (!adminToken.trim()) return
    setLoading(true)
    setError('')
    setMessage('')
    try {
      localStorage.setItem('clearout_admin_token', adminToken.trim())

      const settingsData = await adminApi<{ ok: boolean; settings: AdminPlatformSettings }>('?resource=settings')
      setSettings(settingsData.settings)

      const summaryData = await adminApi<{ ok: boolean; summary: any }>('?resource=summary')
      setSummary(summaryData.summary)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Admin load failed.')
    } finally {
      setLoading(false)
    }
  }

  async function updateSetting(key: AdminSettingKey, value: boolean | 'email' | 'sms') {
    setSaving(key)
    setError('')
    setMessage('')
    try {
      const data = await adminApi<{ ok: boolean; settings: AdminPlatformSettings }>(
        '?resource=settings&action=update',
        {
          method: 'POST',
          body: JSON.stringify({ key, value }),
        }
      )

      setSettings(data.settings)
      setMessage(lang === 'zh' ? '设置已更新。' : 'Settings updated.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed.')
    } finally {
      setSaving('')
    }
  }

  useEffect(() => {
    if (adminToken.trim()) {
      loadAdmin()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const requestOn = Boolean(settings?.customer_requests_enabled)
  const dispatchOn = Boolean(settings?.lead_dispatch_enabled)
  const claimsOn = Boolean(settings?.provider_claims_enabled)
  const channel = settings?.lead_dispatch_channel || 'email'

  return <main>
    <PageHero
      eyebrow="Admin"
      title={lang === 'zh' ? '运营总控后台' : 'Platform controls'}
      text={lang === 'zh'
        ? '控制客户提交、系统派单、服务商接单，以及 Email / SMS 派单通道。'
        : 'Control customer requests, lead dispatch, provider claiming, and Email / SMS dispatch channel.'}
    />

    <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-10">
      <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="text-xl font-semibold">{lang === 'zh' ? 'Admin token' : 'Admin token'}</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={adminToken}
            onChange={e => setAdminToken(e.target.value)}
            placeholder="ADMIN_TOKEN"
            type="password"
            className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-700/10"
          />
          <button
            onClick={loadAdmin}
            disabled={loading || !adminToken.trim()}
            className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? (lang === 'zh' ? '加载中…' : 'Loading…') : (lang === 'zh' ? '加载后台' : 'Load admin')}
          </button>
        </div>

        {error && <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-900 ring-1 ring-red-200">{error}</div>}
        {message && <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200">{message}</div>}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Stat label="Providers" value={Number(summary?.providers_total || providers.length)}/>
        <Stat label="Active providers" value={Number(summary?.providers_active || 0)}/>
        <Stat label="Leads" value={Number(summary?.leads_total || leads.length)}/>
        <Stat label="Claims" value={Number(summary?.claims_total || 0)}/>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AdminControlCard
          title={lang === 'zh' ? '客户提交' : 'Customer requests'}
          status={requestOn ? 'ON' : 'OFF'}
          description={lang === 'zh'
            ? '关闭后，客户不能提交新的清运需求；后端 API 会直接拒绝。'
            : 'When paused, customers cannot submit new requests; the backend API rejects submissions.'}
        >
          <AdminToggleButton
            active={requestOn}
            disabled={!settings || saving === 'customer_requests_enabled'}
            onClick={() => updateSetting('customer_requests_enabled', !requestOn)}
            onText={lang === 'zh' ? '允许提交' : 'Accepting'}
            offText={lang === 'zh' ? '暂停提交' : 'Paused'}
          />
        </AdminControlCard>

        <AdminControlCard
          title={lang === 'zh' ? '系统派单' : 'Lead dispatch'}
          status={dispatchOn ? 'ON' : 'OFF'}
          description={lang === 'zh'
            ? '关闭后，客户需求仍可进入后台，但不会发送给服务商。'
            : 'When paused, leads can still enter admin, but notifications are not sent to providers.'}
        >
          <AdminToggleButton
            active={dispatchOn}
            disabled={!settings || saving === 'lead_dispatch_enabled'}
            onClick={() => updateSetting('lead_dispatch_enabled', !dispatchOn)}
            onText={lang === 'zh' ? '允许派单' : 'Dispatch on'}
            offText={lang === 'zh' ? '暂停派单' : 'Dispatch paused'}
          />
        </AdminControlCard>

        <AdminControlCard
          title={lang === 'zh' ? '服务商接单' : 'Provider claiming'}
          status={claimsOn ? 'ON' : 'OFF'}
          description={lang === 'zh'
            ? '关闭后，服务商即使打开 claim link，也不能领取客户联系方式。'
            : 'When paused, providers can open claim links but cannot unlock customer contact details.'}
        >
          <AdminToggleButton
            active={claimsOn}
            disabled={!settings || saving === 'provider_claims_enabled'}
            onClick={() => updateSetting('provider_claims_enabled', !claimsOn)}
            onText={lang === 'zh' ? '允许接单' : 'Claiming on'}
            offText={lang === 'zh' ? '暂停接单' : 'Claiming paused'}
          />
        </AdminControlCard>

        <AdminControlCard
          title={lang === 'zh' ? '派单通道' : 'Dispatch channel'}
          status={channel.toUpperCase()}
          description={lang === 'zh'
            ? '控制新派单使用 Email 还是 SMS。默认先保持 Email，正式切换时再改 SMS。'
            : 'Controls whether new dispatches use Email or SMS. Keep Email by default until SMS cutover.'}
        >
          <div className="flex flex-wrap gap-2">
            <button
              disabled={!settings || saving === 'lead_dispatch_channel'}
              onClick={() => updateSetting('lead_dispatch_channel', 'email')}
              className={cn(
                'rounded-full px-5 py-2.5 text-sm font-semibold ring-1',
                channel === 'email' ? 'bg-slate-950 text-white ring-slate-950' : 'bg-white text-slate-700 ring-black/10 hover:bg-slate-50'
              )}
            >
              Email
            </button>
            <button
              disabled={!settings || saving === 'lead_dispatch_channel'}
              onClick={() => updateSetting('lead_dispatch_channel', 'sms')}
              className={cn(
                'rounded-full px-5 py-2.5 text-sm font-semibold ring-1',
                channel === 'sms' ? 'bg-red-700 text-white ring-red-700' : 'bg-white text-slate-700 ring-black/10 hover:bg-slate-50'
              )}
            >
              SMS
            </button>
          </div>
        </AdminControlCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AdminList title="Local recent leads" rows={leads.slice(0, 8).map(l => `${l.community_or_postal} · ${l.community_slug || 'custom'} · ${areaName(l.area, 'en')} · ${l.status}`)} />
        <AdminList title="Local dispatches" rows={dispatches.slice(0, 8).map(d => `${d.provider_name} ← ${d.lead_id} · ${d.payment_status}`)} />
      </div>
    </section>
  </main>
}

function AdminControlCard({ title, description, status, children }: { title: string; description: string; status: string; children: React.ReactNode }) {
  return <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <span className={cn(
        'shrink-0 rounded-full px-3 py-1 text-xs font-bold ring-1',
        status === 'ON' || status === 'EMAIL' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' :
        status === 'SMS' ? 'bg-red-50 text-red-800 ring-red-200' :
        'bg-slate-100 text-slate-700 ring-black/10'
      )}>{status}</span>
    </div>
    <div className="mt-5">{children}</div>
  </div>
}

function AdminToggleButton({ active, disabled, onClick, onText, offText }: { active: boolean; disabled: boolean; onClick: () => void; onText: string; offText: string }) {
  return <button
    disabled={disabled}
    onClick={onClick}
    className={cn(
      'rounded-full px-5 py-2.5 text-sm font-semibold ring-1 disabled:cursor-not-allowed disabled:opacity-50',
      active ? 'bg-emerald-600 text-white ring-emerald-600 hover:bg-emerald-700' : 'bg-slate-950 text-white ring-slate-950 hover:bg-red-700'
    )}
  >
    {active ? onText : offText}
  </button>
}


function FAQPage({ lang }: { lang: Lang }) {
  const rows = lang === 'zh' ? [
    ['你们是清运公司吗？','不是。Clearout YYC 是本地清运需求分发平台，不拥有车辆，也不直接提供清运服务。实际服务由独立本地服务商提供。'],
    ['会不会电话骚扰？','不会。每个需求最多发送给 3 个本地清运服务商。我们不做群发电话。'],
    ['是否保证一定有服务商联系我？','不保证。我们帮助你把已确认的需求发送给本地服务商，但服务商响应、报价和是否接单由服务商自行决定。'],
    ['最终价格由谁决定？','最终价格、上门时间、付款方式和服务细节由你和服务商直接确认。Clearout YYC 不承诺最终价格。'],
    ['危险物品怎么办？','油漆、化学品、煤气罐、机油、电池、石棉等不会作为普通清运单自动分发。'],
    ['客户需要付费吗？','Beta 阶段客户免费提交需求。'],
  ] : [
    ['Are you a junk removal company?','No. Clearout YYC is a local junk removal request platform. We do not own vehicles or provide removal services directly. Actual service is provided by independent local providers.'],
    ['Will I get phone spam?','No. Each request may be sent to up to 3 local junk removal providers. We do not blast your phone number.'],
    ['Do you guarantee a provider will contact me?','No. We help send your phone-verified request to local providers, but provider response, quote, and acceptance are not guaranteed.'],
    ['Who confirms the final price?','Final price, arrival time, payment method, and service details are confirmed directly between you and the provider. Clearout YYC does not promise final pricing.'],
    ['What about hazardous items?','Paint, chemicals, propane tanks, motor oil, batteries, asbestos, and unknown hazardous waste are not auto-dispatched as regular junk leads.'],
    ['Is it free for customers?','Yes. During beta, customers submit requests for free.'],
  ]
  return <main><PageHero eyebrow="FAQ" title={lang === 'zh' ? '常见问题' : 'Frequently asked questions'} text={lang === 'zh' ? '先把平台边界讲清楚。' : 'Clear boundaries before you submit.'}/><section className="mx-auto max-w-4xl px-5 py-12 sm:px-8 lg:px-10"><div className="grid gap-4">{rows.map(([q,a]) => <div key={q} className="rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-black/5"><h3 className="font-semibold">{q}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{a}</p></div>)}</div></section></main>
}

function LegalPage({ lang, kind }: { lang: Lang; kind: 'privacy' | 'terms' }) { return <main><PageHero eyebrow={kind === 'privacy' ? 'Privacy' : 'Terms'} title={kind === 'privacy' ? (lang === 'zh' ? '隐私政策' : 'Privacy Policy') : (lang === 'zh' ? '服务条款' : 'Terms of Use')} text={lang === 'zh' ? 'MVP 文案，正式上线前建议本地法律审阅。' : 'MVP wording. Have local counsel review before production.'}/><section className="mx-auto max-w-4xl px-5 py-12 text-sm leading-7 text-slate-700 sm:px-8 lg:px-10"><div className="rounded-[2rem] bg-white p-7 shadow-sm ring-1 ring-black/5"><h2 className="text-2xl font-semibold text-slate-950">{lang === 'zh' ? '平台边界' : 'Platform boundaries'}</h2><p className="mt-4">{lang === 'zh' ? 'Clearout YYC 是本地清运需求分发平台，不拥有、不经营、不控制任何清运车辆或服务。实际服务、最终价格、付款、损坏索赔、保险、处置和预约由客户与独立服务商直接确认。' : 'Clearout YYC is a local junk removal lead distribution platform. It does not own, operate, or control removal vehicles or services. Actual service, final price, payment, damage claims, insurance, disposal, and scheduling are handled directly between customer and independent provider.'}</p><ul className="mt-5 list-disc space-y-2 pl-5"><li>Planning/request information only; no final price guarantee.</li><li>Requests may be shared with up to 3 opt-in providers after customer phone verification.</li><li>Hazardous or restricted items are not regular auto-dispatch leads.</li><li>Providers are independent and responsible for legal operation, insurance, disposal, and service claims.</li><li>Customer photos/contact details are used for lead distribution only in this MVP model. Future paid contact access, if enabled, will disclose terms before provider access.</li></ul></div></section></main> }

function PageHero({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) { return <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10"><div className="w-full rounded-[2.2rem] bg-slate-950 px-6 py-12 text-white shadow-sm ring-1 ring-black/5 sm:px-10 sm:py-14 lg:px-12"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-200">{eyebrow}</p><h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">{title}</h1><p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">{text}</p></div></section> }
function SectionHead({ eyebrow, title, text, centered=false }: { eyebrow: string; title: string; text: string; centered?: boolean }) { return <div className={cn('max-w-3xl', centered && 'mx-auto text-center')}><p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-red-700">{eyebrow}</p><h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2><p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">{text}</p></div> }
function Line({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex items-start gap-3">{icon}<span>{text}</span></div> }
function CompareCard({ title, rows, muted=false }: { title: string; rows: string[]; muted?: boolean }) { return <div className={cn('rounded-[1.7rem] p-6 shadow-sm ring-1', muted ? 'border-red-200 bg-red-50 text-red-950 ring-red-200' : 'border-emerald-200 bg-emerald-50 text-emerald-950 ring-emerald-200')}><h3 className="text-xl font-semibold">{title}</h3><ul className={cn('mt-5 grid gap-3 text-sm', muted ? 'text-red-900' : 'text-emerald-900')}>{rows.map(r => <li key={r}>{muted ? '✕' : '✔'} {r}</li>)}</ul></div> }
function StepTitle({ n, title, className='' }: { n: string; title: string; className?: string }) { return <div className={cn('flex items-center gap-3 border-t border-black/5 pt-6 first:border-t-0 first:pt-0', className)}><span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-700 text-sm font-semibold text-white shadow-sm">{n}</span><h3 className="text-xl font-semibold tracking-tight">{title}</h3></div> }
function ChoiceCard({ selected, onClick, title, danger=false }: { selected: boolean; onClick: () => void; title: string; danger?: boolean }) { return <button type="button" onClick={onClick} className={cn('rounded-2xl border p-4 text-left text-sm font-semibold transition', selected ? (danger ? 'border-red-700 bg-red-100 text-red-950 ring-2 ring-red-700/10 shadow-sm' : 'border-red-700 bg-red-50 text-red-950 ring-2 ring-red-700/10 shadow-sm') : 'border-black/10 bg-white text-slate-700 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm')}>{title}</button> }
function MultiSelect({ title, options, selected, setSelected, lang }: { title: string; options: ReadonlyArray<{ readonly id: string; readonly en: string; readonly zh: string }>; selected: string[]; setSelected: (v: string[]) => void; lang: Lang }) { return <div className="mt-6"><b>{title}</b><div className="mt-3 flex flex-wrap gap-2">{options.map(o => <button key={o.id} type="button" onClick={() => setSelected(toggleValue(selected, o.id))} className={cn('rounded-full px-4 py-2 text-sm font-semibold ring-1', selected.includes(o.id) ? 'bg-red-700 text-white ring-red-700' : 'bg-white text-slate-700 ring-black/10')}>{o[lang]}</button>)}</div></div> }
function Select({ label, value, setValue, options, lang }: { label: string; value: string; setValue: (v: string) => void; options: Array<{ id: string; en: string; zh: string }>; lang: Lang }) { return <label><span className="mb-2 block text-sm font-semibold">{label}</span><select value={value} onChange={e => setValue(e.target.value)} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-700/10">{options.map(o => <option key={o.id} value={o.id}>{o[lang]}</option>)}</select></label> }
function PhoneInput({ label, value, setValue, help='' }: { label: string; value: string; setValue: (v: string) => void; help?: string }) {
  return <label>
    <span className="mb-2 block text-sm font-semibold">{label}</span>
    <div className="flex items-stretch gap-2">
      <div className="flex min-w-[64px] items-center justify-center rounded-2xl border border-black/10 bg-slate-50 px-4 text-sm font-bold text-slate-700">+1</div>
      <input
        inputMode="tel"
        autoComplete="tel-national"
        value={formatLocalPhoneInput(value)}
        onChange={e => setValue(formatLocalPhoneInput(e.target.value))}
        placeholder="403-555-1234"
        className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-700/10"
      />
    </div>
    {help && <p className="mt-2 text-xs text-slate-500">{help}</p>}
  </label>
}

function Input({ label, value, setValue, placeholder='' }: { label: string; value: string; setValue: (v: string) => void; placeholder?: string }) { return <label><span className="mb-2 block text-sm font-semibold">{label}</span><input value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-700/10" /></label> }
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-black/5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold text-red-700">{value}</p></div> }
function AdminList({ title, rows }: { title: string; rows: string[] }) { return <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5"><h2 className="text-xl font-semibold">{title}</h2><div className="mt-4 grid gap-3">{rows.length ? rows.map((r, i) => <div key={i} className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">{r}</div>) : <p className="text-sm text-slate-500">No data yet.</p>}</div></div> }
function LeadDebugCard({ lead, lang }: { lead: Lead; lang: Lang }) { return <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/5"><h3 className="text-xl font-semibold">{lang === 'zh' ? '需求摘要' : 'Request summary'}</h3><div className="mt-4 grid gap-2 text-sm text-slate-600"><p><b>ID:</b> {lead.lead_id}</p><p><b>{lang === 'zh' ? '电话确认' : 'Phone confirmed'}:</b> {String(lead.phone_verified)}</p><p><b>{lang === 'zh' ? '可分发' : 'Dispatch eligible'}:</b> {String(lead.dispatch_eligible)}</p><p><b>{lang === 'zh' ? '摘要' : 'Summary'}:</b> {lead.dispatch_summary}</p></div></div> }
function Footer({ lang }: { lang: Lang }) { return <footer className="border-t border-black/5 bg-white px-5 py-10 sm:px-8 lg:px-10"><div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3"><div><b>Clearout YYC</b><p className="mt-2 text-sm leading-6 text-slate-500">{lang === 'zh' ? 'Calgary 本地清运需求分发平台。由 Aurora Site Solutions 运营。' : 'Calgary local junk removal lead distribution. Operated by Aurora Site Solutions.'}</p></div><div className="grid gap-2 text-sm"><button onClick={() => go('/request')} className="text-left text-slate-600 hover:text-red-700">{copy[lang].request}</button><button onClick={() => go('/providers')} className="text-left text-slate-600 hover:text-red-700">{copy[lang].providers}</button><button onClick={() => go('/provider/leads')} className="text-left text-slate-600 hover:text-red-700">Provider Portal</button><button onClick={() => go('/areas')} className="text-left text-slate-600 hover:text-red-700">{lang === 'zh' ? '服务区域' : 'Service Areas'}</button><button onClick={() => go('/furniture-removal-calgary')} className="text-left text-slate-600 hover:text-red-700">{lang === 'zh' ? '家具清运' : 'Furniture Removal'}</button><button onClick={() => go('/garage-cleanout-calgary')} className="text-left text-slate-600 hover:text-red-700">{lang === 'zh' ? '车库清理' : 'Garage Cleanout'}</button><button onClick={() => go('/faq')} className="text-left text-slate-600 hover:text-red-700">FAQ</button></div><div className="grid gap-2 text-sm"><button onClick={() => go('/privacy')} className="text-left text-slate-600 hover:text-red-700">{lang === 'zh' ? '隐私政策' : 'Privacy Policy'}</button><button onClick={() => go('/terms')} className="text-left text-slate-600 hover:text-red-700">{lang === 'zh' ? '服务条款' : 'Terms of Use'}</button><p className="text-slate-400">© {new Date().getFullYear()} Clearout YYC</p></div></div></footer> }
function MobileStickyCta({ lang }: { lang: Lang }) { return <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 p-3 backdrop-blur lg:hidden"><button onClick={() => go('/request')} className="flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">{lang === 'zh' ? '免费提交清运需求' : 'Submit free request'}<ArrowRight size={17}/></button></div> }
