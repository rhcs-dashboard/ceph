import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';

import _ from 'lodash';
import moment from 'moment';
import { Observable, Subscription, timer } from 'rxjs';

import { ClusterService } from '~/app/shared/api/cluster.service';
import { ConfigurationService } from '~/app/shared/api/configuration.service';
import { HealthService } from '~/app/shared/api/health.service';
import { MgrModuleService } from '~/app/shared/api/mgr-module.service';
import { OsdService } from '~/app/shared/api/osd.service';
import { PrometheusService } from '~/app/shared/api/prometheus.service';
import { Promqls } from '~/app/shared/enum/dashboard-promqls.enum';
import { Icons } from '~/app/shared/enum/icons.enum';
import { DashboardDetails } from '~/app/shared/models/cd-details';
import { Permissions } from '~/app/shared/models/permissions';
import { AlertmanagerAlert } from '~/app/shared/models/prometheus-alerts';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import {
  FeatureTogglesMap$,
  FeatureTogglesService
} from '~/app/shared/services/feature-toggles.service';
import { SummaryService } from '~/app/shared/services/summary.service';

@Component({
  selector: 'cd-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  detailsCardData: DashboardDetails = {};
  osdSettings$: Observable<any>;
  interval: number;
  permissions: Permissions;
  enabledFeature$: FeatureTogglesMap$;
  color: string;
  capacity$: Observable<any>;
  healthData$: Observable<Object>;
  prometheusAlerts$: Observable<AlertmanagerAlert[]>;

  isAlertmanagerConfigured = false;
  icons = Icons;
  showAlerts = false;
  simplebar = {
    autoHide: false
  };
  textClass: string;
  borderClass: string;
  alertType: string;
  alerts: AlertmanagerAlert[];
  crticialActiveAlerts: number;
  warningActiveAlerts: number;
  usedCapacity: any;
  ips: any;
  ops: any;
  latency: any;
  clientThroughput: any;
  recoveryThroughput: any;
  timerGetPrometheusDataSub: Subscription;
  timerTime = 30000;
  readonly last5Minutes = this.timeToDate(5 * 60);

  constructor(
    private summaryService: SummaryService,
    private configService: ConfigurationService,
    private mgrModuleService: MgrModuleService,
    private clusterService: ClusterService,
    private osdService: OsdService,
    private authStorageService: AuthStorageService,
    private featureToggles: FeatureTogglesService,
    private healthService: HealthService,
    public prometheusService: PrometheusService,
    private ngZone: NgZone
  ) {
    this.permissions = this.authStorageService.getPermissions();
    this.enabledFeature$ = this.featureToggles.get();
  }

  ngOnInit() {
    this.getDetailsCardData();
    this.osdSettings$ = this.osdService.getOsdSettings();
    this.capacity$ = this.clusterService.getCapacity();
    this.healthData$ = this.healthService.getMinimalHealth();
    this.triggerPrometheusAlerts();
    this.getPrometheusData(this.last5Minutes);

    this.ngZone.runOutsideAngular(() => {
      this.interval = window.setInterval(() => {
        this.ngZone.run(() => {
          this.triggerPrometheusAlerts();
        });
      }, 5000);
    });
  }

  ngOnDestroy() {
    window.clearInterval(this.interval);
    this.timerGetPrometheusDataSub.unsubscribe();
  }

  toggleAlertsWindow(type: string) {
    type === 'danger' ? (this.alertType = 'critical') : (this.alertType = type);
    this.textClass = `text-${type}`;
    this.borderClass = `border-${type}`;
    this.showAlerts = !this.showAlerts;
  }

  getDetailsCardData() {
    this.configService.get('fsid').subscribe((data) => {
      this.detailsCardData.fsid = data['value'][0]['value'];
    });
    this.mgrModuleService.getConfig('orchestrator').subscribe((data) => {
      const orchStr = data['orchestrator'];
      this.detailsCardData.orchestrator = orchStr.charAt(0).toUpperCase() + orchStr.slice(1);
    });
    this.summaryService.subscribe((summary) => {
      const version = summary.version.replace('ceph version ', '').split(' ');
      this.detailsCardData.cephVersion =
        version[0] + ' ' + version.slice(2, version.length).join(' ');
    });
  }

  triggerPrometheusAlerts() {
    this.prometheusService.ifAlertmanagerConfigured(() => {
      this.isAlertmanagerConfigured = true;

      this.prometheusService.getAlerts().subscribe((alerts) => {
        this.alerts = alerts;
        this.crticialActiveAlerts = alerts.filter(
          (alert: AlertmanagerAlert) =>
            alert.status.state === 'active' && alert.labels.severity === 'critical'
        ).length;
        this.warningActiveAlerts = alerts.filter(
          (alert: AlertmanagerAlert) =>
            alert.status.state === 'active' && alert.labels.severity === 'warning'
        ).length;
      });
    });
  }

  getPrometheusData(selectedTime: any) {
    if (this.timerGetPrometheusDataSub) {
      this.timerGetPrometheusDataSub.unsubscribe();
    }
    this.timerGetPrometheusDataSub = timer(0, this.timerTime).subscribe(() => {
      selectedTime = this.updateTimeStamp(selectedTime);
      this.prometheusService
        .getPrometheusData({
          params: Promqls.USEDCAPACITY,
          start: selectedTime['start'],
          end: selectedTime['end'],
          step: selectedTime['step']
        })
        .subscribe((data: any) => {
          if (data.result.length) {
            this.usedCapacity = data.result[0].values;
          }
        });

      this.prometheusService
        .getPrometheusData({
          params: Promqls.IPS,
          start: selectedTime['start'],
          end: selectedTime['end'],
          step: selectedTime['step']
        })
        .subscribe((data: any) => {
          if (data.result.length) {
            this.ips = data.result[0].values;
          }
        });

      this.prometheusService
        .getPrometheusData({
          params: Promqls.OPS,
          start: selectedTime['start'],
          end: selectedTime['end'],
          step: selectedTime['step']
        })
        .subscribe((data: any) => {
          if (data.result.length) {
            this.ops = data.result[0].values;
          }
        });

      this.prometheusService
        .getPrometheusData({
          params: Promqls.LATENCY,
          start: selectedTime['start'],
          end: selectedTime['end'],
          step: selectedTime['step']
        })
        .subscribe((data: any) => {
          if (data.result.length) {
            this.latency = data.result[0].values;
          }
        });

      this.prometheusService
        .getPrometheusData({
          params: Promqls.CLIENTTHROUGHPUT,
          start: selectedTime['start'],
          end: selectedTime['end'],
          step: selectedTime['step']
        })
        .subscribe((data: any) => {
          if (data.result.length) {
            this.clientThroughput = data.result[0].values;
          }
        });

      this.prometheusService
        .getPrometheusData({
          params: Promqls.RECOVERYTHOROUGHPUT,
          start: selectedTime['start'],
          end: selectedTime['end'],
          step: selectedTime['step']
        })
        .subscribe((data: any) => {
          if (data.result.length) {
            this.recoveryThroughput = data.result[0].values;
          }
        });
    });
  }

  private timeToDate(secondsAgo: number, step: number = 15): any {
    const date: number = moment().unix() - secondsAgo;
    const dateNow: number = moment().unix();
    const formattedDate: any = {
      start: date,
      end: dateNow,
      step: step
    };
    return formattedDate;
  }

  private updateTimeStamp(selectedTime: any): any {
    console.log(selectedTime);
    let formattedDate = {};
    const date: number = selectedTime['start'] + this.timerTime / 1000;
    const dateNow: number = selectedTime['end'] + this.timerTime / 1000;
    formattedDate = {
      start: date,
      end: dateNow,
      step: selectedTime['step']
    };
    return formattedDate;
  }
}
