import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'
import { PrismaService } from '../../prisma/prisma.service'
import { AppConfig } from '../../config/configuration'
import { WhatsappStatus } from '@prisma/client'

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name)

  constructor(
    private prisma: PrismaService,
    private http: HttpService,
    private config: ConfigService<AppConfig>,
  ) {}

  private headers() {
    const key = this.config.get('evolution.apiKey', { infer: true })
    return key ? { apikey: key } : {}
  }

  private baseUrl(): string {
    return this.config.get('evolution.apiUrl', { infer: true })?.replace(/\/$/, '') ?? ''
  }

  async getInstanceForTenant(tenantId: string) {
    const inst = await this.prisma.whatsappInstance.findFirst({
      where: { tenantId },
    })
    if (!inst) throw new NotFoundException('Instância WhatsApp não configurada')
    return inst
  }

  async status(tenantId: string) {
    const inst = await this.getInstanceForTenant(tenantId)
    const url = `${this.baseUrl()}/instance/connectionState/${encodeURIComponent(inst.instanceName)}`
    try {
      const res = await firstValueFrom(
        this.http.get<unknown>(url, { headers: this.headers(), timeout: 15000 }),
      )
      return { instance: inst.instanceName, remote: res.data }
    } catch (e) {
      this.logger.warn(`Falha ao consultar Evolution: ${String(e)}`)
      return { instance: inst.instanceName, remote: null, error: 'unreachable' }
    }
  }

  async connect(tenantId: string) {
    const inst = await this.getInstanceForTenant(tenantId)
    const url = `${this.baseUrl()}/instance/connect/${encodeURIComponent(inst.instanceName)}`
    await this.prisma.whatsappInstance.update({
      where: { tenantId },
      data: { status: WhatsappStatus.CONNECTING },
    })
    try {
      const res = await firstValueFrom(
        this.http.get<unknown>(url, { headers: this.headers(), timeout: 30000 }),
      )
      return res.data
    } catch (e) {
      this.logger.warn(`connect falhou: ${String(e)}`)
      throw e
    }
  }

  async qrcode(tenantId: string) {
    const inst = await this.getInstanceForTenant(tenantId)
    const url = `${this.baseUrl()}/instance/qr/${encodeURIComponent(inst.instanceName)}`
    const res = await firstValueFrom(
      this.http.get<unknown>(url, { headers: this.headers(), timeout: 30000 }),
    )
    return res.data
  }

  async disconnect(tenantId: string) {
    const inst = await this.getInstanceForTenant(tenantId)
    const url = `${this.baseUrl()}/instance/logout/${encodeURIComponent(inst.instanceName)}`
    try {
      const res = await firstValueFrom(
        this.http.post<unknown>(url, {}, { headers: this.headers(), timeout: 15000 }),
      )
      await this.prisma.whatsappInstance.update({
        where: { tenantId },
        data: { status: WhatsappStatus.DISCONNECTED },
      })
      return res.data
    } catch (e) {
      this.logger.warn(`disconnect falhou: ${String(e)}`)
      await this.prisma.whatsappInstance.update({
        where: { tenantId },
        data: { status: WhatsappStatus.DISCONNECTED },
      })
      return { ok: false }
    }
  }
}
