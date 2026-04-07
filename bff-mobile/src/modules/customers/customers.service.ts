import { Injectable } from '@nestjs/common';
import { HttpClientService } from '../../infrastructure/http-client.service';
import { CustomerQueryDto, CreateCustomerBffDto } from './customers.dto';

export interface MobileCustomerItem {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
}

@Injectable()
export class CustomersService {
  constructor(private readonly httpClient: HttpClientService) {}

  async findAll(
    accessToken: string,
    query: CustomerQueryDto
  ): Promise<{ items: MobileCustomerItem[]; total: number }> {
    const params = new URLSearchParams();
    params.set('take', String(query.take ?? 30));
    params.set('skip', '0');
    if (query.search) params.set('name', query.search);

    const response = await this.httpClient.get<
      { data: MobileCustomerItem[]; total: number } | MobileCustomerItem[]
    >(`/customers?${params.toString()}`, accessToken);

    if (Array.isArray(response)) {
      return { items: response, total: response.length };
    }
    return { items: response.data, total: response.total };
  }

  async create(
    accessToken: string,
    dto: CreateCustomerBffDto
  ): Promise<MobileCustomerItem> {
    return this.httpClient.post<MobileCustomerItem>(
      '/customers',
      dto,
      accessToken
    );
  }
}
