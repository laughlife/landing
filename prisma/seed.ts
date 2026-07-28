import 'dotenv/config'
import { Hash } from '@adonisjs/hash'
import { Scrypt } from '@adonisjs/hash/drivers/scrypt'
import { prisma } from '../server/utils/db'

const passwordHasher = new Hash(new Scrypt())

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required.`)
  }
  return value
}

async function seedAdmin() {
  const username = requireEnv('ADMIN_INITIAL_USERNAME')
  const password = requireEnv('ADMIN_INITIAL_PASSWORD')
  if (password.length < 16) {
    throw new Error('ADMIN_INITIAL_PASSWORD must contain at least 16 characters.')
  }

  const existing = await prisma.adminUser.findUnique({ where: { username } })
  if (!existing) {
    await prisma.adminUser.create({
      data: {
        username,
        passwordHash: await passwordHasher.make(password),
        displayName: '超级管理员',
        role: 'SUPER_ADMIN',
        status: 'ENABLED'
      }
    })
  }
}

async function seedCompanyAndSettings() {
  await prisma.companyProfile.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      companyName: '南阳市吴月商贸行（个人独资）',
      shortName: '吴月商贸',
      slogan: '连接优质产品，成就长期合作',
      logo: '/wuyue.png',
      favicon: '/favicon.ico',
      heroTitle: '让可靠供应，成为业务增长的底气',
      heroSubtitle: '我们专注于优质商贸资源整合、产品供应与企业采购服务，为合作伙伴提供稳定、透明、高效的长期支持。',
      introduction: '南阳市吴月商贸行是一家以产品供应、商贸协作和企业服务为核心的现代化商贸企业。',
      fullDescription: '<p>南阳市吴月商贸行坚持长期主义，以可靠产品、清晰流程和及时响应服务每一位合作伙伴。当前内容为初始化演示内容，可在管理后台随时维护。</p>',
      businessScope: '<p>产品供应、渠道协作、企业采购、项目配套与商贸咨询。</p>',
      advantages: ['稳定供应与严格选品', '快速响应与清晰流程', '灵活协作与长期服务', '真实透明的项目沟通'],
      address: '河南省南阳市',
      phone: '0377-00000000',
      email: 'contact@example.com',
      workingHours: '周一至周六 09:00-18:00',
      registrationInfo: '演示内容，请在后台完善真实登记信息'
    }
  })

  await prisma.siteSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      siteName: '南阳市吴月商贸行',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      siteTitle: '南阳市吴月商贸行｜产品供应与商贸服务',
      siteKeywords: '南阳商贸,产品供应,企业采购,商贸服务',
      siteDescription: '南阳市吴月商贸行提供产品供应、渠道协作、企业采购与项目配套服务。',
      logo: '/wuyue.png',
      favicon: '/favicon.ico',
      footerText: '以可靠供应与专业服务，连接每一次长期合作。',
      copyright: '南阳市吴月商贸行（个人独资）',
      themeConfig: { primary: 'blue', neutral: 'slate' },
      socialLinks: [],
      contactConfig: {
        phone: '0377-00000000',
        email: 'contact@example.com',
        address: '河南省南阳市'
      }
    }
  })
}

async function seedCategoriesAndProducts() {
  const categories = [
    {
      name: '商务办公',
      slug: 'business-office',
      summary: '面向企业日常运营的实用产品与配套方案。'
    },
    {
      name: '生活消费',
      slug: 'consumer-goods',
      summary: '兼顾品质、实用性与稳定供应的生活消费产品。'
    },
    {
      name: '项目配套',
      slug: 'project-support',
      summary: '针对项目采购与场景落地的综合配套产品。'
    }
  ]

  const categoryMap = new Map<string, number>()
  for (const [index, category] of categories.entries()) {
    const record = await prisma.productCategory.upsert({
      where: { slug: category.slug },
      update: {},
      create: {
        ...category,
        description: `${category.summary} 当前为演示分类，可在后台修改。`,
        coverImage: '/wuyue.png',
        sortOrder: index + 1,
        status: 'ENABLED'
      }
    })
    categoryMap.set(category.slug, record.id)
  }

  const products = [
    ['企业办公组合方案', 'office-combination', 'WY-OFFICE-01', 'business-office'],
    ['高效文件管理套装', 'document-management-kit', 'WY-OFFICE-02', 'business-office'],
    ['品质生活精选组合', 'quality-life-selection', 'WY-LIFE-01', 'consumer-goods'],
    ['日常实用物资套装', 'daily-supplies-kit', 'WY-LIFE-02', 'consumer-goods'],
    ['项目基础物资方案', 'project-basic-supplies', 'WY-PROJECT-01', 'project-support'],
    ['定制化配套方案', 'custom-support-solution', 'WY-PROJECT-02', 'project-support']
  ] as const

  for (const [index, [name, slug, model, categorySlug]] of products.entries()) {
    await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        categoryId: categoryMap.get(categorySlug)!,
        name: `演示产品｜${name}`,
        slug,
        model,
        subtitle: '面向企业采购与项目协作的演示产品',
        summary: '这是用于系统初始化和功能验证的演示产品，可登录后台替换为真实产品信息。',
        description: '<p>本产品为初始化演示内容，用于验证产品详情、分类筛选、SEO 与后台维护流程。</p>',
        coverImage: '/wuyue.png',
        features: ['稳定供货', '按需配置', '专业支持'],
        applications: ['企业办公', '项目采购', '渠道协作'],
        specifications: [
          {
            group: '基础参数',
            items: [
              { label: '产品类型', value: '演示产品' },
              { label: '服务方式', value: '按需协作' }
            ]
          }
        ],
        sortOrder: index + 1,
        isFeatured: index < 4,
        status: 'PUBLISHED',
        publishedAt: new Date()
      }
    })
  }
}

async function seedServicesPartnersBannersAndArticles() {
  const services = [
    ['企业采购服务', 'enterprise-procurement', 'i-lucide-briefcase-business'],
    ['产品供应协作', 'product-supply', 'i-lucide-package-check'],
    ['项目配套支持', 'project-support-service', 'i-lucide-blocks'],
    ['商贸咨询服务', 'trade-consulting', 'i-lucide-messages-square']
  ] as const

  for (const [index, [name, slug, icon]] of services.entries()) {
    await prisma.serviceItem.upsert({
      where: { slug },
      update: {},
      create: {
        name: `演示服务｜${name}`,
        slug,
        icon,
        coverImage: '/wuyue.png',
        summary: '围绕真实需求提供清晰、可靠、可持续的商贸协作。',
        description: '<p>当前为初始化演示服务，可在后台维护服务介绍、特点和流程。</p>',
        features: ['需求沟通', '方案确认', '执行交付', '持续服务'],
        processSteps: [
          { title: '需求沟通', description: '了解目标、场景与交付要求。' },
          { title: '方案确认', description: '明确产品、周期与协作边界。' },
          { title: '执行交付', description: '按约定推进并同步关键节点。' }
        ],
        sortOrder: index + 1,
        isFeatured: true,
        status: 'ENABLED'
      }
    })
  }

  for (let index = 1; index <= 6; index++) {
    const slug = `demo-partner-${index}`
    await prisma.partner.upsert({
      where: { slug },
      update: {},
      create: {
        name: `演示合作伙伴 ${index}`,
        slug,
        logo: '/wuyue.png',
        summary: '用于展示合作伙伴模块的演示内容。',
        description: '<p>本条目为初始化演示内容，不代表真实品牌合作关系。</p>',
        cooperationType: index % 2 === 0 ? '渠道协作' : '供应合作',
        sortOrder: index,
        isFeatured: true,
        status: 'ENABLED'
      }
    })
  }

  for (let index = 1; index <= 3; index++) {
    await prisma.banner.upsert({
      where: { id: index },
      update: {},
      create: {
        id: index,
        title: index === 1 ? '让可靠供应，成为增长的底气' : `演示主题 Banner ${index}`,
        subtitle: '初始化演示内容，可在管理后台替换 PC 图、移动端图和行动按钮。',
        image: '/wuyue.png',
        mobileImage: '/wuyue.png',
        buttonText: index === 1 ? '查看产品' : '联系我们',
        buttonLink: index === 1 ? '/products' : '/contact',
        position: 'HOME_HERO',
        sortOrder: index,
        status: 'ENABLED'
      }
    })
  }

  const articles = [
    ['欢迎使用吴月商贸门户管理系统', 'welcome-to-wuyue-portal'],
    ['如何建立稳定透明的商贸协作', 'reliable-trade-collaboration'],
    ['企业采购流程中的关键环节', 'enterprise-procurement-process']
  ] as const

  for (const [index, [title, slug]] of articles.entries()) {
    await prisma.article.upsert({
      where: { slug },
      update: {},
      create: {
        title: `演示文章｜${title}`,
        slug,
        summary: '用于验证新闻列表、详情、分页和动态 SEO 的初始化演示内容。',
        content: '<p>这是一篇初始化演示文章。请登录管理后台发布真实的公司动态与行业资讯。</p>',
        coverImage: '/wuyue.png',
        author: '吴月商贸',
        status: 'PUBLISHED',
        isFeatured: index === 0,
        sortOrder: index + 1,
        publishedAt: new Date()
      }
    })
  }
}

async function main() {
  await seedAdmin()
  await seedCompanyAndSettings()
  await seedCategoriesAndProducts()
  await seedServicesPartnersBannersAndArticles()
  console.log('Portal seed completed.')
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Portal seed failed.')
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
