import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { maskApiKey } from '../../utils/mask-secret'
import { PatchTenantAiDto, PatchTenantFunnelDto, PatchTenantGeneralDto } from './dto/tenant.dto'

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async getMe(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, active: true },
    })
    if (!tenant) throw new NotFoundException('Tenant não encontrado')

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      active: tenant.active,
      aiProvider: tenant.aiProvider,
      aiModel: tenant.aiModel,
      aiApiKeyMasked: maskApiKey(tenant.aiApiKey),
      aiBaseUrl: tenant.aiBaseUrl,
      aiTimeoutMs: tenant.aiTimeoutMs,
      aiConfidThreshold: tenant.aiConfidThreshold,
      aiPrompt: tenant.aiPrompt,
      promptVersion: tenant.promptVersion,
      requiredFields: tenant.requiredFields,
      specialistName: tenant.specialistName,
      specialistContact: tenant.specialistContact,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    }
  }

  async patchGeneral(tenantId: string, dto: PatchTenantGeneralDto) {
    const data: {
      name?: string
      specialistName?: string | null
      specialistContact?: string | null
    } = {}
    if (dto.name !== undefined) data.name = dto.name
    if (dto.specialistName !== undefined) data.specialistName = dto.specialistName
    if (dto.specialistContact !== undefined) data.specialistContact = dto.specialistContact

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    })

    return this.getMe(tenantId)
  }

  async patchAi(tenantId: string, dto: PatchTenantAiDto) {
    const data: {
      aiProvider?: string
      aiModel?: string
      aiApiKey?: string
      aiBaseUrl?: string
      aiTimeoutMs?: number
      aiConfidThreshold?: number
      aiPrompt?: string
      promptVersion?: { increment: number }
    } = {}

    if (dto.aiProvider !== undefined) data.aiProvider = dto.aiProvider
    if (dto.aiModel !== undefined) data.aiModel = dto.aiModel
    if (dto.aiApiKey !== undefined && dto.aiApiKey.trim() !== '') data.aiApiKey = dto.aiApiKey
    if (dto.aiBaseUrl !== undefined) data.aiBaseUrl = dto.aiBaseUrl
    if (dto.aiTimeoutMs !== undefined) data.aiTimeoutMs = dto.aiTimeoutMs
    if (dto.aiConfidThreshold !== undefined) data.aiConfidThreshold = dto.aiConfidThreshold
    if (dto.aiPrompt !== undefined) {
      data.aiPrompt = dto.aiPrompt
      data.promptVersion = { increment: 1 }
    }

    if (Object.keys(data).length === 0) return this.getMe(tenantId)

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    })

    return this.getMe(tenantId)
  }

  async patchFunnel(tenantId: string, dto: PatchTenantFunnelDto) {
    if (dto.requiredFields !== undefined) {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { requiredFields: dto.requiredFields },
      })
    }
    return this.getMe(tenantId)
  }
}
