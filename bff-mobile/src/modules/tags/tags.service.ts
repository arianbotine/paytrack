import { Injectable } from '@nestjs/common';
import { HttpClientService } from '../../infrastructure/http-client.service';

export interface MobileTagItem {
  id: string;
  name: string;
  color: string;
}

export interface CreateTagBffDto {
  name: string;
  color?: string;
}

@Injectable()
export class TagsService {
  constructor(private readonly httpClient: HttpClientService) {}

  async findAll(
    accessToken: string
  ): Promise<{ items: MobileTagItem[]; total: number }> {
    const response = await this.httpClient.get<
      { data: MobileTagItem[]; total: number } | MobileTagItem[]
    >('/tags?take=100&orderBy=name&order=asc', accessToken);

    if (Array.isArray(response)) {
      return { items: response, total: response.length };
    }
    return { items: response.data, total: response.total };
  }

  async create(
    accessToken: string,
    dto: CreateTagBffDto
  ): Promise<MobileTagItem> {
    return this.httpClient.post<MobileTagItem>('/tags', dto, accessToken);
  }
}
