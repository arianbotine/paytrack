import { Injectable } from '@nestjs/common';
import { HttpClientService } from '../../infrastructure/http-client.service';
import { VendorQueryDto, CreateVendorBffDto } from './vendors.dto';

export interface MobileVendorItem {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
}

@Injectable()
export class VendorsService {
  constructor(private readonly httpClient: HttpClientService) {}

  async findAll(
    accessToken: string,
    query: VendorQueryDto
  ): Promise<{ items: MobileVendorItem[]; total: number }> {
    const params = new URLSearchParams();
    params.set('take', String(query.take ?? 30));
    params.set('skip', '0');
    if (query.search) params.set('name', query.search);

    const response = await this.httpClient.get<
      { data: MobileVendorItem[]; total: number } | MobileVendorItem[]
    >(`/vendors?${params.toString()}`, accessToken);

    if (Array.isArray(response)) {
      return { items: response, total: response.length };
    }
    return { items: response.data, total: response.total };
  }

  async create(
    accessToken: string,
    dto: CreateVendorBffDto
  ): Promise<MobileVendorItem> {
    return this.httpClient.post<MobileVendorItem>('/vendors', dto, accessToken);
  }
}
