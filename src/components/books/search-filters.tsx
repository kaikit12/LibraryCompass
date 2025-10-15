'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, SlidersHorizontal, X, QrCode } from 'lucide-react';
import { genres } from '@/lib/genres';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export interface SearchFiltersState {
  searchTerm: string;
  genre: string;
  status: string;
  publicationYear: string;
  isbn: string;
  sortBy: string;
  minRating: string;
  series: string; // New: Filter by series
}

interface SearchFiltersProps {
  filters: SearchFiltersState;
  onFilterChange: (filters: SearchFiltersState) => void;
  activeFiltersCount: number;
  onQRScanClick?: () => void;
  showQRButton?: boolean;
  availableSeries?: string[]; // List of series names from books
}

export function SearchFilters({ 
  filters, 
  onFilterChange, 
  activeFiltersCount,
  onQRScanClick,
  showQRButton = false,
  availableSeries = [],
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key: keyof SearchFiltersState, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      searchTerm: '',
      genre: 'all',
      status: 'all',
      publicationYear: 'all',
      isbn: '',
      sortBy: 'newest',
      minRating: '0',
      series: 'all',
    });
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 100 }, (_, i) => currentYear - i);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Tìm kiếm & Lọc sách</CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">{activeFiltersCount} bộ lọc</Badge>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Xóa tất cả
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Search Bar */}
        <div className="space-y-2">
          <Label htmlFor="search">Tìm kiếm</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Tên sách, tác giả, Library ID..."
                value={filters.searchTerm}
                onChange={(e) => updateFilter('searchTerm', e.target.value)}
                className="pl-10"
              />
            </div>
            {showQRButton && onQRScanClick && (
              <Button
                variant="outline"
                size="icon"
                onClick={onQRScanClick}
                title="Quét QR Code thư viện"
                className="shrink-0"
              >
                <QrCode className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Quick Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="genre">Thể loại</Label>
            <Select value={filters.genre} onValueChange={(value) => updateFilter('genre', value)}>
              <SelectTrigger id="genre">
                <SelectValue placeholder="Tất cả thể loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả thể loại</SelectItem>
                {genres.filter(Boolean).map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Tình trạng</Label>
            <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="available">Có sẵn</SelectItem>
                <SelectItem value="borrowed">Đang mượn</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sortBy">Sắp xếp theo</Label>
            <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
              <SelectTrigger id="sortBy">
                <SelectValue placeholder="Mới nhất" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Mới nhất</SelectItem>
                <SelectItem value="oldest">Cũ nhất</SelectItem>
                <SelectItem value="popular">Phổ biến nhất</SelectItem>
                <SelectItem value="rating">Đánh giá cao</SelectItem>
                <SelectItem value="title-asc">Tên A-Z</SelectItem>
                <SelectItem value="title-desc">Tên Z-A</SelectItem>
                <SelectItem value="series-order">Theo bộ sách</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced Filters (Collapsible) */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              {isOpen ? 'Ẩn bộ lọc nâng cao' : 'Hiện bộ lọc nâng cao'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="series">Bộ sách</Label>
                <Select
                  value={filters.series}
                  onValueChange={(value) => updateFilter('series', value)}
                >
                  <SelectTrigger id="series">
                    <SelectValue placeholder="Tất cả bộ sách" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">Tất cả bộ sách</SelectItem>
                    {availableSeries.map((seriesName) => (
                      <SelectItem key={seriesName} value={seriesName}>
                        📚 {seriesName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="isbn">ISBN</Label>
                <Input
                  id="isbn"
                  placeholder="978-xxx..."
                  value={filters.isbn}
                  onChange={(e) => updateFilter('isbn', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="publicationYear">Năm xuất bản</Label>
                <Select
                  value={filters.publicationYear}
                  onValueChange={(value) => updateFilter('publicationYear', value)}
                >
                  <SelectTrigger id="publicationYear">
                    <SelectValue placeholder="Tất cả năm" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">Tất cả năm</SelectItem>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minRating">Đánh giá tối thiểu</Label>
                <Select
                  value={filters.minRating}
                  onValueChange={(value) => updateFilter('minRating', value)}
                >
                  <SelectTrigger id="minRating">
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Tất cả</SelectItem>
                    <SelectItem value="4">⭐ 4+ sao</SelectItem>
                    <SelectItem value="3">⭐ 3+ sao</SelectItem>
                    <SelectItem value="2">⭐ 2+ sao</SelectItem>
                    <SelectItem value="1">⭐ 1+ sao</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
