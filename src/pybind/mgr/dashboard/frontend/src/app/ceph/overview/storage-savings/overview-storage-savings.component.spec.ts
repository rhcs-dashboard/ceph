import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { CompressionStats } from '~/app/shared/enum/hardware.enum';
import { OverviewStorageService } from '~/app/shared/api/storage-overview.service';
import { AreaChartComponent } from '~/app/shared/components/area-chart/area-chart.component';
import { FormatterService } from '~/app/shared/services/formatter.service';
import { OverviewStorageSavingsComponent } from './overview-storage-savings.component';

@Component({
  selector: 'cd-area-chart',
  template: '',
  standalone: true
})
class AreaChartStubComponent {
  readonly chartTitle = input('');
  readonly chartKey = input('');
  readonly dataUnit = input('');
  readonly legendEnabled = input(true);
  readonly rawData = input<unknown[]>([]);
  readonly subHeading = input('');
  readonly height = input('');
  readonly decimals = input(0);
  readonly chartType = input('');
}

const ABOVE_THRESHOLD: CompressionStats = {
  fcm_drive_count: 4,
  phy_util_percent: 38.5,
  log_util_percent: 61.2,
  savings_bytes: 7696581394432,
  compression_ratio: 2.4,
  efficiency_percent: 58.3
};

const BELOW_THRESHOLD: CompressionStats = {
  fcm_drive_count: 4,
  phy_util_percent: 12.5,
  log_util_percent: null,
  savings_bytes: null,
  compression_ratio: null,
  efficiency_percent: null
};

const trendOf = (...values: number[]) => ({
  SAVINGS: values.map((value, i): [number, string] => [1_700_000_000 + i * 86400, String(value)])
});

describe('OverviewStorageSavingsComponent', () => {
  let fixture: ComponentFixture<OverviewStorageSavingsComponent>;
  let component: OverviewStorageSavingsComponent;
  let element: HTMLElement;

  const getSavingsTrend = jest.fn();
  const formatToBinary = jest.fn();

  const render = async (stats: CompressionStats, trend: Observable<unknown> = of(trendOf())) => {
    getSavingsTrend.mockReturnValue(trend);

    fixture = TestBed.createComponent(OverviewStorageSavingsComponent);
    fixture.componentRef.setInput('compression', stats);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const text = () => element.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  beforeEach(async () => {
    getSavingsTrend.mockReset();
    formatToBinary.mockReset().mockReturnValue([7, 'TiB']);

    await TestBed.configureTestingModule({
      imports: [OverviewStorageSavingsComponent],
      providers: [
        { provide: OverviewStorageService, useValue: { getSavingsTrend } },
        { provide: FormatterService, useValue: { formatToBinary } }
      ]
    })
      .overrideComponent(OverviewStorageSavingsComponent, {
        remove: { imports: [AreaChartComponent] },
        add: { imports: [AreaChartStubComponent] }
      })
      .compileComponents();
  });

  describe('with compression data', () => {
    it('should render total savings and the stat values', async () => {
      await render(ABOVE_THRESHOLD, of(trendOf(5e12, 6e12, 7e12)));

      expect(formatToBinary).toHaveBeenCalledWith(ABOVE_THRESHOLD.savings_bytes, true);
      expect(component.totalSavingsFormatted()).toBe('7 TiB');
      expect(text()).toContain('Total savings');
      expect(text()).toContain('7 TiB');
      expect(text()).toContain('2.4');
      expect(text()).toContain('58.3%');
      expect(text()).toContain('38.5%');
      expect(text()).not.toContain('Not available');
    });

    it('should render the savings trend chart', async () => {
      await render(ABOVE_THRESHOLD, of(trendOf(5e12, 6e12, 7e12)));

      expect(element.querySelector('cd-area-chart')).not.toBeNull();
      expect(component.savingsTrendData()).toHaveLength(3);
      expect(component.savingsTrendData()[0].values.Used).toBe(5e12);
    });

    it('should request the trend for the last 7 days with a daily step', async () => {
      await render(ABOVE_THRESHOLD);

      const [start, end, step] = getSavingsTrend.mock.calls[0];
      expect(step).toBe(86400);
      expect(end - start).toBe(7 * 86400);
    });

    it('should show the empty trend message when the trend request fails', async () => {
      await render(
        ABOVE_THRESHOLD,
        throwError(() => new Error('prometheus down'))
      );

      expect(component.savingsTrendData()).toEqual([]);
      expect(element.querySelector('cd-area-chart')).toBeNull();
      expect(text()).toContain('No trend data available.');
      expect(text()).toContain('2.4');
    });
  });

  describe('below the 100 GiB threshold', () => {
    it('should show "Not available" for the gated values but keep utilisation', async () => {
      await render(BELOW_THRESHOLD);

      expect(component.totalSavingsFormatted()).toBe('');
      expect(formatToBinary).not.toHaveBeenCalled();
      expect(text().match(/Not available/g)).toHaveLength(3);
      expect(text()).toContain('12.5%');
    });
  });

  describe('trend indicator', () => {
    const indicator = () => element.querySelector('cd-icon[type="growth"]');

    it('should show the growth icon when the trend is rising', async () => {
      await render(ABOVE_THRESHOLD, of(trendOf(5e12, 6e12, 7e12)));

      expect(component.isSavingsTrendingUp()).toBe(true);
      expect(indicator()).not.toBeNull();
    });

    it('should not show the growth icon when the trend is flat', async () => {
      await render(ABOVE_THRESHOLD, of(trendOf(7e12, 7e12, 7e12)));

      expect(component.isSavingsTrendingUp()).toBe(false);
      expect(indicator()).toBeNull();
    });

    it('should not show the growth icon when the trend is falling', async () => {
      await render(ABOVE_THRESHOLD, of(trendOf(7e12, 6e12, 5e12)));

      expect(component.isSavingsTrendingUp()).toBe(false);
      expect(indicator()).toBeNull();
    });

    it('should not show the growth icon with fewer than two data points', async () => {
      await render(ABOVE_THRESHOLD, of(trendOf(7e12)));

      expect(component.isSavingsTrendingUp()).toBe(false);
      expect(indicator()).toBeNull();
    });

    it('should not show the growth icon without trend data', async () => {
      await render(ABOVE_THRESHOLD, of({}));

      expect(component.savingsTrendData()).toEqual([]);
      expect(component.isSavingsTrendingUp()).toBe(false);
      expect(indicator()).toBeNull();
    });
  });
});
