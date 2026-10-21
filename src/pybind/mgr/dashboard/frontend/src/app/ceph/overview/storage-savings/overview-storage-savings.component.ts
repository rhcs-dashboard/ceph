import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  OnInit,
  signal,
  ViewEncapsulation
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { GridModule, LayoutModule, TooltipModule } from 'carbon-components-angular';

import { SECONDS_PER_DAY, TREND_DAYS } from '~/app/shared/constants/query.constants';
import { CompressionStats } from '~/app/shared/enum/hardware.enum';
import { OverviewStorageService } from '~/app/shared/api/storage-overview.service';
import { FormatterService } from '~/app/shared/services/formatter.service';
import { AreaChartComponent } from '~/app/shared/components/area-chart/area-chart.component';
import { ComponentsModule } from '~/app/shared/components/components.module';
import { TrendPoint } from '~/app/shared/models/overview';

type SavingsStatKey = keyof Pick<
  CompressionStats,
  'compression_ratio' | 'efficiency_percent' | 'phy_util_percent'
>;

interface SavingsStat {
  key: SavingsStatKey;
  label: string;
  unit: string;
  description: string;
}

const SAVINGS_STATS: SavingsStat[] = [
  {
    key: 'compression_ratio',
    label: $localize`Compression`,
    unit: '',
    description: $localize`Ratio of logical data to physical storage after compression. Higher values indicate better compression efficiency. Needs at least 100 GiB of data to be shown.`
  },
  {
    key: 'efficiency_percent',
    label: $localize`Efficiency`,
    unit: '%',
    description: $localize`Percentage of storage capacity saved through compression. Shows cost savings and infrastructure efficiency. Needs at least 100 GiB of data to be shown.`
  },
  {
    key: 'phy_util_percent',
    label: $localize`Utilisation`,
    unit: '%',
    description: $localize`Current usage of physical storage capacity. Monitor this for capacity planning and expansion decisions.`
  }
];

@Component({
  selector: 'cd-overview-storage-savings',
  standalone: true,
  imports: [
    CommonModule,
    ComponentsModule,
    GridModule,
    LayoutModule,

    TooltipModule,
    AreaChartComponent
  ],
  templateUrl: './overview-storage-savings.component.html',
  styleUrl: './overview-storage-savings.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OverviewStorageSavingsComponent implements OnInit {
  private readonly storageService = inject(OverviewStorageService);
  private readonly formatter = inject(FormatterService);
  private readonly destroyRef = inject(DestroyRef);

  readonly savingsStats = SAVINGS_STATS;
  readonly compression = input.required<CompressionStats>();
  readonly savingsTrendData = signal<TrendPoint[]>([]);

  readonly totalSavingsFormatted = computed(() => {
    const bytes = this.compression().savings_bytes;
    if (bytes === null || bytes === undefined) {
      return '';
    }
    const [value, unit] = this.formatter.formatToBinary(bytes, true);
    return `${value} ${unit}`;
  });

  readonly isSavingsTrendingUp = computed(() => {
    const points = this.savingsTrendData();
    return points.length > 1 && points[points.length - 1].values.Used > points[0].values.Used;
  });

  ngOnInit(): void {
    const end = Math.floor(Date.now() / 1000);
    const start = end - TREND_DAYS * SECONDS_PER_DAY;

    this.storageService
      .getSavingsTrend(start, end, SECONDS_PER_DAY)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (trend) => {
          const raw: [number, string][] = trend?.SAVINGS ?? [];
          this.savingsTrendData.set(
            raw.map(([ts, val]) => ({
              timestamp: new Date(ts * 1000),
              values: { Used: Number(val) }
            }))
          );
        },
        error: () => this.savingsTrendData.set([])
      });
  }
}
