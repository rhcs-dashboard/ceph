import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { forkJoin, Observable, of, Subscription } from 'rxjs';
import { catchError, finalize, mergeMap, switchMap } from 'rxjs/operators';
import { HardwareService } from '~/app/shared/api/hardware.service';
import { HostService } from '~/app/shared/api/host.service';
import { OrchestratorService } from '~/app/shared/api/orchestrator.service';
import { OverviewField } from '~/app/shared/components/resource-overview-card/resource-overview-card.component';
import { CompressionStats, HardwareComponent, HardwareHost } from '~/app/shared/enum/hardware.enum';
import { HostOverviewDetails, STATUS_MAP, getStatus } from '~/app/shared/models/host.interface';
import { Permissions } from '~/app/shared/models/permissions';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import { FormatterService } from '~/app/shared/services/formatter.service';

/* Firmware names, as Redfish reports them, of the versions shown on the page. */
const BMC_FIRMWARE = /\b(bmc|idrac|ilo|xcc)\b|remote access controller/i;
const BIOS_FIRMWARE = /\bbios\b/i;
const PLATFORM_FIRMWARE = /\bplatform\b/i;

interface HostHardware {
  /* null when the host has no node-proxy report */
  report: HardwareHost | null;
  /* null when the host has no FCM drives */
  compression: CompressionStats | null;
}

@Component({
  selector: 'cd-host-resource-page',
  templateUrl: './host-resource-page.component.html',
  standalone: false
})
export class HostResourcePageComponent implements OnInit, OnDestroy {
  private sub = new Subscription();
  hostname = '';
  section = '';
  permissions: Permissions;
  isOverviewLoading = false;
  hostOverviewFields: OverviewField[] = [];
  private host: Partial<HostOverviewDetails> = {};
  /* null when hardware monitoring is disabled */
  private hardware: HostHardware | null = null;
  private hardwareSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private hostService: HostService,
    private orchService: OrchestratorService,
    private hardwareService: HardwareService,
    private authStorageService: AuthStorageService,
    private formatter: FormatterService
  ) {
    this.permissions = this.authStorageService.getPermissions();
  }

  ngOnInit(): void {
    this.sub.add(
      this.route.parent?.paramMap.subscribe((pm: ParamMap) => {
        this.hostname = pm.get('hostname') ?? '';
        this.loadOverview();
        this.loadHardware();
      })
    );
    this.section = this.route.snapshot.data['section'] ?? '';
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.hardwareSub?.unsubscribe();
  }

  private loadOverview(): void {
    if (!this.hostname) {
      this.isOverviewLoading = false;
      this.host = {};
      this.hostOverviewFields = [];
      return;
    }

    let params = new HttpParams();
    params = params.set('offset', '0');
    params = params.set('limit', '1');
    params = params.set('search', this.hostname);
    params = params.set('sort', '+hostname');
    this.isOverviewLoading = true;

    this.sub.add(
      this.orchService
        .status()
        .pipe(
          mergeMap((orchStatus) => {
            const factsAvailable = this.hostService.checkHostsFactsAvailable(orchStatus);
            return this.hostService.list(params, factsAvailable.toString());
          }),
          finalize(() => {
            this.isOverviewLoading = false;
          })
        )
        .subscribe({
          next: (hosts: object[]) => {
            const hostList = (Array.isArray(hosts) ? hosts : []) as HostOverviewDetails[];
            this.host = hostList.find((item) => item.hostname === this.hostname) ?? {};
            this.updateOverviewFields();
          },
          error: () => {
            this.host = {};
            this.updateOverviewFields();
          }
        })
    );
  }

  /* Hardware data is only fetched when the cephadm hw_monitoring flag is enabled. */
  private loadHardware(): void {
    this.hardwareSub?.unsubscribe();
    this.hardware = null;
    if (!this.hostname) {
      return;
    }
    const hostname = this.hostname;
    this.hardwareSub = this.hardwareService.isHardwareMonitoringEnabled$
      .pipe(
        switchMap((enabled) =>
          enabled
            ? forkJoin({
                report: this.ignoreError(this.hardwareService.getHost(hostname)),
                compression: this.ignoreError(this.hardwareService.getCompression(hostname))
              })
            : of(null)
        )
      )
      .subscribe((hardware) => {
        this.hardware = hardware && {
          report: hardware.report,
          compression: hardware.compression?.fcm_drive_count ? hardware.compression : null
        };
        this.updateOverviewFields();
      });
  }

  /* A host without node-proxy data is expected: show no hardware, not an error. */
  private ignoreError<T>(request: Observable<T>): Observable<T | null> {
    return request.pipe(
      catchError((error) => {
        error?.preventDefault?.();
        return of(null);
      })
    );
  }

  private updateOverviewFields(): void {
    this.hostOverviewFields = [
      ...this.buildOverviewFields(this.host),
      ...this.buildHardwareFields(this.hardware)
    ];
  }

  private buildHardwareFields(hardware: HostHardware | null): OverviewField[] {
    if (!hardware) {
      return [];
    }
    const { report, compression } = hardware;
    const fields: OverviewField[] = [];

    if (report) {
      const temperatures = report.status?.temperatures?.components ?? [];
      fields.push(
        {
          label: $localize`CPU temperature`,
          value: this.maxTemperature(temperatures, 'cpu', /\bcpu\d*\b/i)
        },
        {
          label: $localize`NVMe temperature`,
          value: this.maxTemperature(temperatures, 'storagedevice', /nvme/i)
        },
        {
          label: $localize`BMC version`,
          value: this.firmwareVersion(report, BMC_FIRMWARE)
        },
        {
          label: $localize`BIOS version`,
          value: this.firmwareVersion(report, BIOS_FIRMWARE)
        },
        {
          label: $localize`Platform firmware`,
          value: this.firmwareVersion(report, PLATFORM_FIRMWARE)
        },
        {
          label: $localize`Drives`,
          value: report.status?.storage?.total
        }
      );
    }

    if (compression) {
      const minDataHelp = $localize`Needs at least 100 GiB of data on the FCM drives to be shown.`;
      fields.push(
        {
          label: $localize`Savings`,
          value:
            compression.savings_bytes === null
              ? null
              : this.formatter.formatToBinary(compression.savings_bytes, false, 1),
          helperText: minDataHelp
        },
        {
          label: $localize`Compression ratio`,
          value:
            compression.compression_ratio === null ? null : `${compression.compression_ratio}:1`,
          helperText: minDataHelp
        }
      );
    }
    return fields;
  }

  /**
   * Hottest sensor of a kind, e.g. "52°C". A sensor matches by its Redfish
   * PhysicalContext, or by its name when the BMC leaves the context out.
   */
  private maxTemperature(
    sensors: HardwareComponent[],
    physicalContext: string,
    name: RegExp
  ): string | null {
    const readings = sensors.filter(
      (sensor) =>
        typeof sensor.reading === 'number' &&
        (sensor.physical_context?.toLowerCase() === physicalContext || name.test(sensor.name ?? ''))
    );
    if (!readings.length) {
      return null;
    }
    const hottest = readings.reduce((max, sensor) =>
      (sensor.reading as number) > (max.reading as number) ? sensor : max
    );
    const units = hottest.reading_units ?? '';
    const value = Math.round(hottest.reading as number);
    return ['cel', 'c', 'celsius'].includes(units.toLowerCase())
      ? `${value}°C`
      : `${value} ${units}`.trim();
  }

  private firmwareVersion(report: HardwareHost, name: RegExp): string | null {
    const match = Object.entries(report.firmware ?? {}).find(([firmware]) => name.test(firmware));
    return match ? match[1] : null;
  }

  private buildOverviewFields(host: Partial<HostOverviewDetails> = {}): OverviewField[] {
    const hostStatus = STATUS_MAP[getStatus(host)];
    const hostnameWithAddr = host?.addr ? `${this.hostname} (${host.addr})` : this.hostname;
    const totalMemory = this.formatter.formatToBinary(
      this.hostService.getTotalMemoryBytes(host),
      false,
      1
    );
    const rawCapacity = this.formatter.formatToBinary(
      this.hostService.getRawCapacityBytes(host),
      false,
      1
    );

    return [
      {
        label: $localize`Hostname`,
        value: hostnameWithAddr,
        type: 'text'
      },
      {
        label: $localize`Labels`,
        values: host?.labels ?? [],
        type: 'tags'
      },
      {
        label: $localize`Status`,
        value: hostStatus?.label,
        type: 'status',
        status: hostStatus?.icon
      },
      {
        label: $localize`Model`,
        value: host?.model,
        type: 'text'
      },
      {
        label: $localize`CPUs`,
        value: host?.cpu_count,
        type: 'text'
      },
      {
        label: $localize`Cores`,
        value: host?.cpu_cores,
        type: 'text'
      },
      {
        label: $localize`Total Memory`,
        value: totalMemory
      },
      {
        label: $localize`Raw Capacity`,
        value: rawCapacity
      },
      {
        label: $localize`HDDs`,
        value: host?.hdd_count,
        type: 'text'
      },
      {
        label: $localize`Flash`,
        value: host?.flash_count,
        type: 'text'
      },
      {
        label: $localize`NICs`,
        value: host?.nic_count,
        type: 'text'
      }
    ];
  }
}
