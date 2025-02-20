import { Component, OnDestroy, OnInit } from '@angular/core';

import _ from 'lodash';
import { BehaviorSubject, Observable, Subscription, of } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';

import { HealthService } from '~/app/shared/api/health.service';
import { OsdService } from '~/app/shared/api/osd.service';
import { PrometheusService } from '~/app/shared/api/prometheus.service';
import { Promqls as queries } from '~/app/shared/enum/dashboard-promqls.enum';
import { Icons } from '~/app/shared/enum/icons.enum';
import { DashboardDetails } from '~/app/shared/models/cd-details';
import { Permissions } from '~/app/shared/models/permissions';
import { AlertmanagerAlert } from '~/app/shared/models/prometheus-alerts';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import {
  FeatureTogglesMap$,
  FeatureTogglesService
} from '~/app/shared/services/feature-toggles.service';
import { RefreshIntervalService } from '~/app/shared/services/refresh-interval.service';
import { SummaryService } from '~/app/shared/services/summary.service';
import { PrometheusListHelper } from '~/app/shared/helpers/prometheus-list-helper';
import { PrometheusAlertService } from '~/app/shared/services/prometheus-alert.service';
import { OrchestratorService } from '~/app/shared/api/orchestrator.service';
import { AlertClass } from '~/app/shared/enum/health-icon.enum';
import { SettingsService } from '~/app/shared/api/settings.service';
import { HardwareService } from '~/app/shared/api/hardware.service';
import { MgrModuleService } from '~/app/shared/api/mgr-module.service';
import { CallHomeService } from '~/app/shared/api/call-home.service';
import { ConnectivityStatus } from '~/app/shared/models/call-home.model';
import { NotificationService } from '~/app/shared/services/notification.service';
import { NotificationType } from '~/app/shared/enum/notification-type.enum';

@Component({
  selector: 'cd-dashboard-v3',
  templateUrl: './dashboard-v3.component.html',
  styleUrls: ['./dashboard-v3.component.scss']
})
export class DashboardV3Component extends PrometheusListHelper implements OnInit, OnDestroy {
  detailsCardData: DashboardDetails = {};
  osdSettingsService: any;
  osdSettings: any;
  interval = new Subscription();
  permissions: Permissions;
  enabledFeature$: FeatureTogglesMap$;
  color: string;
  capacityService: any;
  capacity: any;
  healthData$: Observable<Object>;
  prometheusAlerts$: Observable<AlertmanagerAlert[]>;
  callHomeStatus$: Observable<ConnectivityStatus>;
  callHomeStatusSubject = new BehaviorSubject<ConnectivityStatus>(null);

  callHomeRefreshLoading = false;

  icons = Icons;
  flexHeight = true;
  simplebar = {
    autoHide: true
  };
  borderClass: string;
  alertType: string;
  alertClass = AlertClass;
  healthData: any;
  categoryPgAmount: Record<string, number> = {};
  totalPgs = 0;
  queriesResults: { [key: string]: [] } = {
    USEDCAPACITY: [],
    IPS: [],
    OPS: [],
    READLATENCY: [],
    WRITELATENCY: [],
    READCLIENTTHROUGHPUT: [],
    WRITECLIENTTHROUGHPUT: [],
    RECOVERYBYTES: [],
    READIOPS: [],
    WRITEIOPS: []
  };
  telemetryEnabled: boolean;
  telemetryURL = 'https://telemetry-public.ceph.com/';
  origin = window.location.origin;
  private subs = new Subscription();
  managedByConfig$: Observable<any>;
  hardwareHealth: any;
  hardwareEnabled: boolean = false;
  hasHardwareError: boolean = false;
  isHardwareEnabled$: Observable<boolean>;
  hardwareSummary$: Observable<any>;
  hardwareSubject = new BehaviorSubject<any>([]);

  constructor(
    private summaryService: SummaryService,
    private orchestratorService: OrchestratorService,
    private osdService: OsdService,
    private authStorageService: AuthStorageService,
    private featureToggles: FeatureTogglesService,
    private healthService: HealthService,
    private settingsService: SettingsService,
    public prometheusService: PrometheusService,
    private mgrModuleService: MgrModuleService,
    private refreshIntervalService: RefreshIntervalService,
    public prometheusAlertService: PrometheusAlertService,
    private hardwareService: HardwareService,
    private callHomeService: CallHomeService,
    private notificationService: NotificationService
  ) {
    super(prometheusService);
    this.permissions = this.authStorageService.getPermissions();
    this.enabledFeature$ = this.featureToggles.get();
  }

  ngOnInit() {
    super.ngOnInit();
    this.isHardwareEnabled$ = this.getHardwareConfig();
    this.hardwareSummary$ = this.hardwareSubject.pipe(
      switchMap(() =>
        this.hardwareService.getSummary().pipe(
          switchMap((data: any) => {
            this.hasHardwareError = data.host.flawed;
            return of(data);
          })
        )
      )
    );
    this.interval = this.refreshIntervalService.intervalData$.subscribe(() => {
      this.getHealth();
      this.getCapacityCardData();
      if (this.hardwareEnabled) this.hardwareSubject.next([]);
    });
    this.getPrometheusData(this.prometheusService.lastHourDateObject);
    this.getDetailsCardData();
    this.getTelemetryReport();
    this.managedByConfig$ = this.settingsService.getValues('MANAGED_BY_CLUSTERS');
    this.prometheusAlertService.getAlerts(true);
    this.callHomeStatus$ = this.callHomeStatusSubject.pipe(
      switchMap(() => this.callHomeService.getCallHomeStatus().pipe(
        switchMap((status: boolean) => {
          if (status) return this.callHomeService.status()
          return of(null)
        })
      ))
    );
  }

  getTelemetryText(): string {
    return this.telemetryEnabled
      ? 'Cluster telemetry is active'
      : 'Cluster telemetry is inactive. To Activate the Telemetry, \
       click settings icon on top navigation bar and select \
       Telemetry configration.';
  }
  ngOnDestroy() {
    this.interval.unsubscribe();
    this.prometheusService.unsubscribe();
    this.subs?.unsubscribe();
  }

  getHealth() {
    this.healthService.getMinimalHealth().subscribe((data: any) => {
      this.healthData = data;
    });
  }

  toggleAlertsWindow(type: AlertClass) {
    this.alertType === type ? (this.alertType = null) : (this.alertType = type);
  }

  getDetailsCardData() {
    this.healthService.getClusterFsid().subscribe((data: string) => {
      this.detailsCardData.fsid = data;
    });
    this.orchestratorService.getName().subscribe((data: string) => {
      this.detailsCardData.orchestrator = data;
    });
    this.subs.add(
      this.summaryService.subscribe((summary) => {
        const version = summary.version.replace('ceph version ', '').split(' ');
        this.detailsCardData.cephVersion =
          version[0] + ' ' + version.slice(2, version.length).join(' ');
      })
    );
  }

  getCapacityCardData() {
    this.osdSettingsService = this.osdService
      .getOsdSettings()
      .pipe(take(1))
      .subscribe((data: any) => {
        this.osdSettings = data;
      });
    this.capacityService = this.healthService.getClusterCapacity().subscribe((data: any) => {
      this.capacity = data;
    });
  }

  public getPrometheusData(selectedTime: any) {
    this.queriesResults = this.prometheusService.getPrometheusQueriesData(
      selectedTime,
      queries,
      this.queriesResults
    );
  }

  private getTelemetryReport() {
    this.healthService.getTelemetryStatus().subscribe((enabled: boolean) => {
      this.telemetryEnabled = enabled;
    });
  }

  trackByFn(index: any) {
    return index;
  }

  getHardwareConfig(): Observable<any> {
    return this.mgrModuleService.getConfig('cephadm').pipe(
      switchMap((resp: any) => {
        this.hardwareEnabled = resp?.hw_monitoring;
        return of(resp?.hw_monitoring);
      })
    );
  }

  testConnectivity(showNotification = true) {
    this.callHomeRefreshLoading = true;
    this.callHomeService.testConnectivity().subscribe({
      complete: () => {
        if (showNotification) {
          this.notificationService.show(
            NotificationType.success,
            $localize`Refreshed call home connectivity status.`
          );
        }
        this.callHomeStatusSubject.next(null);
        this.callHomeRefreshLoading = false;
      }
    });
  }
}
