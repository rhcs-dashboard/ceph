import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject, Observable, of, Subject, Subscription, throwError } from 'rxjs';
import { OverviewStorageCardComponent } from './overview-storage-card.component';
import { FormatterService } from '~/app/shared/services/formatter.service';
import { HardwareService } from '~/app/shared/api/hardware.service';
import { CompressionStats } from '~/app/shared/enum/hardware.enum';
import { RefreshIntervalService } from '~/app/shared/services/refresh-interval.service';

describe('OverviewStorageCardComponent', () => {
  let component: OverviewStorageCardComponent;
  let fixture: ComponentFixture<OverviewStorageCardComponent>;

  let mockFormatterService: {
    formatToBinary: jest.Mock;
    convertToUnit: jest.Mock;
  };

  let hardwareMonitoringEnabled$: Observable<boolean>;
  let refreshInterval$: BehaviorSubject<number | null>;
  const getCompression = jest.fn();

  const statsWithDrives = (fcm_drive_count: number): CompressionStats => ({
    fcm_drive_count,
    phy_util_percent: null,
    log_util_percent: null,
    savings_bytes: null,
    compression_ratio: null,
    efficiency_percent: null
  });

  beforeEach(async () => {
    hardwareMonitoringEnabled$ = of(false);
    refreshInterval$ = new BehaviorSubject<number | null>(null);
    getCompression.mockReset().mockReturnValue(of(statsWithDrives(0)));

    mockFormatterService = {
      formatToBinary: jest.fn((value: number) => {
        if (value === 1024) return [20, 'TiB'];
        if (value === 512) return [5, 'TiB'];
        if (value === 256) return [5, 'MiB'];
        return [10, 'GiB'];
      }),
      convertToUnit: jest.fn((value: number, fromUnit: string, toUnit: string) => {
        if (value === 20 && fromUnit === 'TiB' && toUnit === 'TiB') return 20;
        if (value === 20 && fromUnit === 'TiB' && toUnit === 'MiB') return 20;
        return value;
      })
    };

    await TestBed.configureTestingModule({
      imports: [OverviewStorageCardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: FormatterService, useValue: mockFormatterService },
        {
          provide: RefreshIntervalService,
          useValue: {
            get intervalData$() {
              return refreshInterval$.asObservable();
            }
          }
        },
        {
          provide: HardwareService,
          useValue: {
            get isHardwareMonitoringEnabled$() {
              return hardwareMonitoringEnabled$;
            },
            getCompression: getCompression
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OverviewStorageCardComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set totalCapacity when valid value is provided', () => {
    component.totalCapacity = 1024;

    expect(component.totalRaw).toBe(20);
    expect(component.totalRawUnit).toBe('TiB');
    expect(mockFormatterService.formatToBinary).toHaveBeenCalledWith(1024, true);
  });

  it('should not set totalCapacity when formatter returns NaN', () => {
    mockFormatterService.formatToBinary.mockReturnValue([NaN, 'GiB']);

    component.totalCapacity = 1024;

    expect(component.totalRaw).toBeNull();
    expect(component.totalRawUnit).toBe('');
  });

  it('should set usedCapacity when valid value is provided', () => {
    component.usedCapacity = 512;

    expect(component.usedRaw).toBe(5);
    expect(component.usedRawUnit).toBe('TiB');
    expect(mockFormatterService.formatToBinary).toHaveBeenCalledWith(512, true);
  });

  it('should not set usedCapacity when formatter returns NaN', () => {
    mockFormatterService.formatToBinary.mockReturnValue([NaN, 'GiB']);

    component.usedCapacity = 512;

    expect(component.usedRaw).toBeNull();
    expect(component.usedRawUnit).toBe('');
  });

  it('should not update chart options until both totalCapacity and usedCapacity are set', () => {
    component.totalCapacity = 1024;

    expect(component.options.meter.proportional.total).toBeNull();
    expect(component.options.meter.proportional.unit).toBe('');
    expect(component.options.tooltip).toBeUndefined();
  });

  it('should update chart options when both totalCapacity and usedCapacity are set', () => {
    component.totalCapacity = 1024;
    component.usedCapacity = 512;

    expect(mockFormatterService.convertToUnit).toHaveBeenCalledWith(20, 'TiB', 'TiB', 1);
    expect(component.options.meter.proportional.total).toBe(20);
    expect(component.options.meter.proportional.unit).toBe('TiB');
    expect(component.options.tooltip).toBeDefined();
    expect(typeof component.options.tooltip?.valueFormatter).toBe('function');
  });

  it('should use used unit in tooltip formatter', () => {
    mockFormatterService.formatToBinary.mockImplementation((value: number) => {
      if (value === 1024) return [20, 'TiB'];
      if (value === 512) return [5, 'MiB'];
      return [10, 'GiB'];
    });

    component.totalCapacity = 1024;
    component.usedCapacity = 512;

    const formatter = component.options.tooltip?.valueFormatter as (value: number) => string;

    expect(component.usedRawUnit).toBe('MiB');
    expect(component.options.meter.proportional.unit).toBe('MiB');
    expect(formatter(12.3)).toBe('12.3 MiB');
  });

  it('should keep default input values for presentational fields', () => {
    expect(component.consumptionTrendData).toEqual([]);
    expect(component.averageDailyConsumption).toBe('');
    expect(component.estimatedTimeUntilFull).toBe('');
    expect(component.breakdownData).toEqual([]);
    expect(component.isBreakdownLoaded).toBe(false);
  });

  describe('savings$', () => {
    type Emission = { stats: CompressionStats | null } | null;

    let emitted: Emission[];
    let subscription: Subscription;

    const subscribe = () => {
      fixture = TestBed.createComponent(OverviewStorageCardComponent);
      emitted = [];
      subscription = fixture.componentInstance.savings$.subscribe((value) => emitted.push(value));
    };

    afterEach(() => subscription?.unsubscribe());

    it('should expose the stats when hardware monitoring is on and FCM drives exist', () => {
      const stats = statsWithDrives(4);
      hardwareMonitoringEnabled$ = of(true);
      getCompression.mockReturnValue(of(stats));

      subscribe();

      expect(emitted).toEqual([null, { stats }]);
      expect(getCompression).toHaveBeenCalledTimes(1);
    });

    it('should expose no stats when no FCM drives are detected', () => {
      hardwareMonitoringEnabled$ = of(true);
      getCompression.mockReturnValue(of(statsWithDrives(0)));

      subscribe();

      expect(emitted).toEqual([null, { stats: null }]);
    });

    it('should expose no stats, nor request compression, when hardware monitoring is off', () => {
      hardwareMonitoringEnabled$ = of(false);

      subscribe();

      expect(emitted).toEqual([null, { stats: null }]);
      expect(getCompression).not.toHaveBeenCalled();
    });

    it('should expose no stats when the first compression request fails', () => {
      hardwareMonitoringEnabled$ = of(true);
      getCompression.mockReturnValue(throwError(() => new Error('boom')));

      subscribe();

      expect(emitted).toEqual([null, { stats: null }]);
    });

    it('should request compression again on every refresh interval tick', () => {
      const first = statsWithDrives(4);
      const second = { ...statsWithDrives(4), compression_ratio: 2.4 };
      hardwareMonitoringEnabled$ = of(true);
      getCompression.mockReturnValueOnce(of(first)).mockReturnValueOnce(of(second));

      subscribe();
      refreshInterval$.next(5000);

      expect(getCompression).toHaveBeenCalledTimes(2);
      expect(emitted).toEqual([null, { stats: first }, { stats: second }]);
    });

    it('should keep the last known stats when a later poll fails', () => {
      const stats = statsWithDrives(4);
      hardwareMonitoringEnabled$ = of(true);
      getCompression
        .mockReturnValueOnce(of(stats))
        .mockReturnValueOnce(throwError(() => new Error('boom')));

      subscribe();
      refreshInterval$.next(5000);

      expect(emitted[emitted.length - 1]).toEqual({ stats });
    });

    it('should not start a new request while the previous one is still pending', () => {
      const pending = new Subject<CompressionStats>();
      hardwareMonitoringEnabled$ = of(true);
      getCompression.mockReturnValue(pending);

      subscribe();
      refreshInterval$.next(5000);
      refreshInterval$.next(10000);

      expect(getCompression).toHaveBeenCalledTimes(1);
    });
  });
});
