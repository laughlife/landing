import 'dotenv/config'
import { Hash } from '@adonisjs/hash'
import { Scrypt } from '@adonisjs/hash/drivers/scrypt'
import { prisma } from '../server/utils/db'

function readArgument(name: string): string | undefined {
  const prefix = `--${name}=`
  return process.argv.find(argument => argument.startsWith(prefix))?.slice(prefix.length)
}

async function main() {
  const username = readArgument('username') || process.env.ADMIN_INITIAL_USERNAME
  if (process.argv.some(argument => argument.startsWith('--password='))) {
    throw new Error('为避免密码出现在进程列表或命令历史中，请仅使用 ADMIN_INITIAL_PASSWORD。')
  }
  const password = process.env.ADMIN_INITIAL_PASSWORD
  const displayName = readArgument('display-name') || '超级管理员'

  if (!username || !/^[a-zA-Z0-9_.-]{3,64}$/.test(username)) {
    throw new Error('请通过 --username 或 ADMIN_INITIAL_USERNAME 提供合法用户名。')
  }
  if (!password || password.length < 16) {
    throw new Error('请通过 ADMIN_INITIAL_PASSWORD 提供至少 16 位强密码。')
  }

  const passwordHash = await new Hash(new Scrypt()).make(password)
  const existing = await prisma.adminUser.findUnique({ where: { username } })

  if (existing) {
    await prisma.adminUser.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        displayName,
        role: 'SUPER_ADMIN',
        status: 'ENABLED',
        sessionVersion: { increment: 1 }
      }
    })
    console.log(`管理员 ${username} 已更新。`)
    return
  }

  await prisma.adminUser.create({
    data: {
      username,
      passwordHash,
      displayName,
      role: 'SUPER_ADMIN',
      status: 'ENABLED'
    }
  })
  console.log(`管理员 ${username} 已创建。`)
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : '管理员创建失败。')
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
