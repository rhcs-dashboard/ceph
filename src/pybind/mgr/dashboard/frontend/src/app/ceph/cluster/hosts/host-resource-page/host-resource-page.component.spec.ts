import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { HttpParams } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { HardwareService } from '~/app/shared/api/hardware.service';
import { HostService } from '~/app/shared/api/host.service';
import { CompressionStats, HardwareHost } from '~/app/shared/enum/hardware.enum';
import { ICON_TYPE } from '~/app/shared/enum/icons.enum';
import { Permissions } from '~/app/shared/models/permissions';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import { FormatterService } from '~/app/shared/services/formatter.service';
import { OrchestratorService } from '~/app/shared/api/orchestrator.service';
import { SharedModule } from '~/app/shared/shared.module';
import { configureTestBed } from '~/testing/unit-test-helper';
import { HostResourcePageComponent } from './host-resource-page.component';

describe('HostResourcePageComponent', () => {
  let component: HostResourcePageComponent;
  let fixture: ComponentFixture<HostResourcePageComponent>;

  const hostServiceSpy = {
    list: jest.fn(),
    checkHostsFactsAvailable: jest.fn(() => true),
    getTotalMemoryBytes: jest.fn((host?: { memory_total_kb?: number | string }) => {
      const memoryKb = Number(host?.memory_total_kb);
      return Number.isFinite(memoryKb) ? memoryKb * 1024 : undefined;
    }),
    getRawCapacityBytes: jest.fn(
      (host?: { hdd_capacity_bytes?: number | string; flash_capacity_bytes?: number | string }) => {
        const hdd = Number(host?.hdd_capacity_bytes);
        const flash = Number(host?.flash_capacity_bytes);
        return Number.isFinite(hdd) && Number.isFinite(flash) ? hdd + flash : undefined;
      }
    )
  };
  const hardwareServiceSpy = {
    isHardwareMonitoringEnabled$: of(false),
    getHost: jest.fn(),
    getCompression: jest.fn()
  };
  const parentParamMap$ = new BehaviorSubject<ParamMap>(convertToParamMap({ hostname: 'node-1' }));

  configureTestBed({
    declarations: [HostResourcePageComponent],
    imports: [HttpClientTestingModule, RouterTestingModule, SharedModule],
    providers: [
      FormatterService,
      {
        provide: OrchestratorService,
        useValue: { status: jest.fn(() => of({})) }
      },
      {
        provide: ActivatedRoute,
        useValue: {
          parent: { paramMap: parentParamMap$.asObservable() },
          snapshot: { data: { section: 'overview' } }
        }
      },
      {
        provide: HostService,
        useValue: hostServiceSpy
      },
      {
        provide: HardwareService,
        useValue: hardwareServiceSpy
      },
      {
        provide: AuthStorageService,
        useValue: {
          getPermissions: () => new Permissions({ hosts: ['read'], grafana: ['read'] })
        }
      }
    ]
  });

  beforeEach(() => {
    /* Create a fresh component instance for each test */
    fixture = TestBed.createComponent(HostResourcePageComponent);
    component = fixture.componentInstance;

    /* Clear mock call history between tests */
    hostServiceSpy.list.mockClear();
    hostServiceSpy.getTotalMemoryBytes.mockClear();
    hostServiceSpy.getRawCapacityBytes.mockClear();
    hardwareServiceSpy.isHardwareMonitoringEnabled$ = of(false);
    hardwareServiceSpy.getHost.mockReset();
    hardwareServiceSpy.getCompression.mockReset();
  });

  const getField = (label: string) => {
    return component.hostOverviewFields?.find((field) => field.label === label);
  };

  it('should create', () => {
    hostServiceSpy.list.mockReturnValue(of([]));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Overview layout', () => {
    it('should build overview fields from host inventory details', () => {
      hostServiceSpy.list.mockReturnValue(
        of([
          {
            hostname: 'node-1',
            addr: '10.0.0.1',
            labels: ['_admin', 'storage'],
            status: 'maintenance',
            model: 'PowerEdge R750',
            cpu_count: '2',
            cpu_cores: 32,
            memory_total_kb: 1024,
            hdd_capacity_bytes: 1024,
            flash_capacity_bytes: 2048,
            hdd_count: '4',
            flash_count: 2,
            nic_count: '6'
          }
        ])
      );

      fixture.detectChanges();

      expect(hostServiceSpy.list).toHaveBeenCalledWith(expect.any(HttpParams), 'true');
      expect(component.hostname).toBe('node-1');
      expect(component.section).toBe('overview');

      expect(getField('Hostname')).toEqual(expect.objectContaining({ value: 'node-1 (10.0.0.1)' }));
      expect(getField('Labels')).toEqual(
        expect.objectContaining({ values: ['_admin', 'storage'] })
      );
      expect(getField('Status')).toEqual(
        expect.objectContaining({ value: 'Maintenance', status: ICON_TYPE.warning })
      );
      expect(getField('Model')).toEqual(expect.objectContaining({ value: 'PowerEdge R750' }));
      expect(getField('CPUs')).toEqual(expect.objectContaining({ value: '2' }));
      expect(getField('Cores')).toEqual(expect.objectContaining({ value: 32 }));
      expect(getField('Total Memory')?.value).toBe('1 MiB'); // 1024 KB transformed
      expect(getField('Raw Capacity')?.value).toBe('3 KiB'); // 1024 + 2048 Bytes transformed
      expect(getField('HDDs')).toEqual(expect.objectContaining({ value: '4' }));
      expect(getField('Flash')).toEqual(expect.objectContaining({ value: 2 }));
      expect(getField('NICs')).toEqual(expect.objectContaining({ value: '6' }));
    });

    it('should fall back to placeholder overview values when host loading fails', () => {
      hostServiceSpy.list.mockReturnValue(throwError(() => new Error('API Error')));

      fixture.detectChanges();

      expect(getField('Hostname')).toEqual(expect.objectContaining({ value: 'node-1' }));
      expect(getField('Labels')).toEqual(expect.objectContaining({ values: [] }));
      expect(getField('Status')).toEqual(expect.objectContaining({ value: undefined }));
      expect(getField('Model')).toEqual(expect.objectContaining({ value: undefined }));
      expect(getField('Total Memory')).toEqual(expect.objectContaining({ value: '-' }));
      expect(getField('Raw Capacity')).toEqual(expect.objectContaining({ value: '-' }));
    });

    it('should keep capacity values empty if standard fact fields are missing', () => {
      hostServiceSpy.list.mockReturnValue(
        of([
          {
            hostname: 'node-1',
            memory_total_bytes: 2048,
            raw_capacity: 4096
          }
        ])
      );

      fixture.detectChanges();

      expect(getField('Total Memory')?.value).toEqual('-');
      expect(getField('Raw Capacity')?.value).toEqual('-');
    });
  });

  describe('Hardware fields', () => {
    const category = (total: number, components: object[] = []) => ({
      health: 'OK',
      total,
      ok: total,
      warning: 0,
      critical: 0,
      unknown: 0,
      components
    });
    const sensor = (name: string, physical_context: string, reading: number | 'unknown') => ({
      id: name,
      chassis_id: '1',
      health: 'OK',
      state: 'Enabled',
      name,
      physical_context,
      reading,
      reading_units: 'Cel'
    });
    const report = {
      hostname: 'node-1',
      sn: 'SN1',
      health: 'OK',
      status: {
        storage: category(7),
        processors: category(2),
        memory: category(0),
        network: category(0),
        power: category(0),
        fans: category(0),
        temperatures: category(4, [
          sensor('CPU1 Temp', 'CPU', 44),
          sensor('CPU2 Temp', 'CPU', 47.6),
          sensor('Inlet Temp', 'Intake', 24),
          sensor('NVMe 0', 'StorageDevice', 52)
        ])
      },
      firmware: {
        BMC: '4.86.00',
        BIOS: '2.14.1',
        'Platform firmware': 'v0.50.d57cfd'
      }
    } as unknown as HardwareHost;
    const compression: CompressionStats = {
      fcm_drive_count: 2,
      phy_util_percent: 20,
      log_util_percent: 40,
      savings_bytes: 17.1 * 1024 ** 4,
      compression_ratio: 4.21,
      efficiency_percent: 50
    };

    beforeEach(() => {
      hostServiceSpy.list.mockReturnValue(of([{ hostname: 'node-1' }]));
    });

    it('should not fetch or show hardware when hardware monitoring is disabled', () => {
      fixture.detectChanges();

      expect(hardwareServiceSpy.getHost).not.toHaveBeenCalled();
      expect(hardwareServiceSpy.getCompression).not.toHaveBeenCalled();
      expect(getField('BMC version')).toBeUndefined();
      expect(getField('Savings')).toBeUndefined();
    });

    it('should show the hardware of the host when hardware monitoring is enabled', () => {
      hardwareServiceSpy.isHardwareMonitoringEnabled$ = of(true);
      hardwareServiceSpy.getHost.mockReturnValue(of(report));
      hardwareServiceSpy.getCompression.mockReturnValue(of(compression));

      fixture.detectChanges();

      expect(hardwareServiceSpy.getHost).toHaveBeenCalledWith('node-1');
      expect(hardwareServiceSpy.getCompression).toHaveBeenCalledWith('node-1');
      expect(getField('Hostname')?.value).toBe('node-1');
      expect(getField('CPU temperature')?.value).toBe('48°C');
      expect(getField('NVMe temperature')?.value).toBe('52°C');
      expect(getField('BMC version')?.value).toBe('4.86.00');
      expect(getField('BIOS version')?.value).toBe('2.14.1');
      expect(getField('Platform firmware')?.value).toBe('v0.50.d57cfd');
      expect(getField('Drives')?.value).toBe(7);
      expect(getField('Savings')?.value).toBe('17.1 TiB');
      expect(getField('Compression ratio')?.value).toBe('4.21:1');
    });

    it('should leave out savings when the host has no FCM drives', () => {
      hardwareServiceSpy.isHardwareMonitoringEnabled$ = of(true);
      hardwareServiceSpy.getHost.mockReturnValue(of(report));
      hardwareServiceSpy.getCompression.mockReturnValue(of({ ...compression, fcm_drive_count: 0 }));

      fixture.detectChanges();

      expect(getField('BMC version')?.value).toBe('4.86.00');
      expect(getField('Savings')).toBeUndefined();
      expect(getField('Compression ratio')).toBeUndefined();
    });

    it('should show empty savings while there is too little data', () => {
      hardwareServiceSpy.isHardwareMonitoringEnabled$ = of(true);
      hardwareServiceSpy.getHost.mockReturnValue(of(report));
      hardwareServiceSpy.getCompression.mockReturnValue(
        of({ ...compression, savings_bytes: null, compression_ratio: null })
      );

      fixture.detectChanges();

      expect(getField('Savings')?.value).toBeNull();
      expect(getField('Compression ratio')?.value).toBeNull();
    });

    it('should leave out hardware fields without a node-proxy report, silently', () => {
      const error = { status: 404, preventDefault: jest.fn() };
      hardwareServiceSpy.isHardwareMonitoringEnabled$ = of(true);
      hardwareServiceSpy.getHost.mockReturnValue(throwError(error));
      hardwareServiceSpy.getCompression.mockReturnValue(of(compression));

      fixture.detectChanges();

      expect(error.preventDefault).toHaveBeenCalled();
      expect(getField('Hostname')?.value).toBe('node-1');
      expect(getField('BMC version')).toBeUndefined();
      expect(getField('Savings')?.value).toBe('17.1 TiB');
    });

    it('should show empty values for sensors and firmware the host does not report', () => {
      hardwareServiceSpy.isHardwareMonitoringEnabled$ = of(true);
      hardwareServiceSpy.getHost.mockReturnValue(
        of({
          ...report,
          status: {
            ...report.status,
            temperatures: category(1, [sensor('CPU1', 'CPU', 'unknown')])
          },
          firmware: {}
        })
      );
      hardwareServiceSpy.getCompression.mockReturnValue(of(compression));

      fixture.detectChanges();

      expect(getField('CPU temperature')?.value).toBeNull();
      expect(getField('NVMe temperature')?.value).toBeNull();
      expect(getField('BMC version')?.value).toBeNull();
    });
  });

  describe('Permission-gated template sections', () => {
    it('should show Physical Disks inventory in storage-devices section when hosts.read is allowed', () => {
      hostServiceSpy.list.mockReturnValue(of([]));
      fixture.detectChanges();

      component.section = 'storage-devices';
      component.permissions = new Permissions({ hosts: ['read'], grafana: ['read'] });
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('cd-inventory'))).toBeTruthy();
    });

    it('should hide Physical Disks inventory in storage-devices section when hosts.read is denied', () => {
      hostServiceSpy.list.mockReturnValue(of([]));
      fixture.detectChanges();

      component.section = 'storage-devices';
      component.permissions = new Permissions({ hosts: [], grafana: ['read'] });
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('cd-inventory'))).toBeFalsy();
    });

    it('should show daemon list in daemons section when hosts.read is allowed', () => {
      hostServiceSpy.list.mockReturnValue(of([]));
      fixture.detectChanges();

      component.section = 'daemons';
      component.permissions = new Permissions({ hosts: ['read'], grafana: ['read'] });
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('cd-service-daemon-list'))).toBeTruthy();
    });

    it('should hide daemon list in daemons section when hosts.read is denied', () => {
      hostServiceSpy.list.mockReturnValue(of([]));
      fixture.detectChanges();

      component.section = 'daemons';
      component.permissions = new Permissions({ hosts: [], grafana: ['read'] });
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('cd-service-daemon-list'))).toBeFalsy();
    });

    it('should show grafana panel in performance section when grafana.read is allowed', () => {
      hostServiceSpy.list.mockReturnValue(of([]));
      fixture.detectChanges();

      component.section = 'performance';
      component.permissions = new Permissions({ hosts: ['read'], grafana: ['read'] });
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('cd-grafana'))).toBeTruthy();
    });

    it('should hide grafana panel in performance section when grafana.read is denied', () => {
      hostServiceSpy.list.mockReturnValue(of([]));
      fixture.detectChanges();

      component.section = 'performance';
      component.permissions = new Permissions({ hosts: ['read'], grafana: [] });
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('cd-grafana'))).toBeFalsy();
    });
  });
});
