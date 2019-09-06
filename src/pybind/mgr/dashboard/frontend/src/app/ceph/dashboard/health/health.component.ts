import { Component, OnDestroy, OnInit } from '@angular/core';

import { I18n } from '@ngx-translate/i18n-polyfill';
import * as _ from 'lodash';
import { Subscription } from 'rxjs/Subscription';

import { HealthService } from '../../../shared/api/health.service';
import { Permissions } from '../../../shared/models/permissions';
import { DimlessBinaryPipe } from '../../../shared/pipes/dimless-binary.pipe';
import { DimlessPipe } from '../../../shared/pipes/dimless.pipe';
import { AuthStorageService } from '../../../shared/services/auth-storage.service';
import {
  FeatureTogglesMap$,
  FeatureTogglesService
} from '../../../shared/services/feature-toggles.service';
import { RefreshIntervalService } from '../../../shared/services/refresh-interval.service';
import { PgCategoryService } from '../../shared/pg-category.service';
import { HealthPieColor } from '../health-pie/health-pie-color.enum';

@Component({
  selector: 'cd-health',
  templateUrl: './health.component.html',
  styleUrls: ['./health.component.scss']
})
export class HealthComponent implements OnInit, OnDestroy {
  healthData: any;
  interval = new Subscription();
  permissions: Permissions;
  enabledFeature$: FeatureTogglesMap$;

  clientStatsConfig = {
    options: {
      plugins: {
        center_text: true
      }
    },
    colors: [
      {
        backgroundColor: [HealthPieColor.DEFAULT_CYAN, HealthPieColor.DEFAULT_PURPLE]
      }
    ]
  };

  rawCapacityChartConfig = {
    options: {
      // title: { display: true, position: 'bottom' },
      plugins: {
        center_text: true
      }
    },
    colors: [
      {
        backgroundColor: [HealthPieColor.DEFAULT_BLUE, HealthPieColor.DEFAULT_GRAY]
      }
    ]
  };
  objectsChartConfig = {
    options: {
      // title: { display: true, position: 'bottom' }
      plugins: {
        center_text: true
      }
    },
    colors: [
      {
        backgroundColor: [
          HealthPieColor.DEFAULT_GREEN,
          HealthPieColor.DEFAULT_YELLOW,
          HealthPieColor.DEFAULT_ORANGE,
          HealthPieColor.DEFAULT_RED
        ]
      }
    ]
  };
  pgStatusChartConfig = {
    options: {
      plugins: {
        center_text: true
      }
    },
    colors: [
      {
        backgroundColor: [
          HealthPieColor.DEFAULT_GREEN,
          HealthPieColor.DEFAULT_YELLOW,
          HealthPieColor.DEFAULT_ORANGE,
          HealthPieColor.DEFAULT_RED
        ]
      }
    ]
  };

  constructor(
    private healthService: HealthService,
    private i18n: I18n,
    private authStorageService: AuthStorageService,
    private pgCategoryService: PgCategoryService,
    private featureToggles: FeatureTogglesService,
    private refreshIntervalService: RefreshIntervalService,
    private dimlessBinary: DimlessBinaryPipe,
    private dimless: DimlessPipe
  ) {
    this.permissions = this.authStorageService.getPermissions();
    this.enabledFeature$ = this.featureToggles.get();
  }

  ngOnInit() {
    this.getHealth();
    this.interval = this.refreshIntervalService.intervalData$.subscribe(() => {
      this.getHealth();
    });
  }

  ngOnDestroy() {
    this.interval.unsubscribe();
  }

  getHealth() {
    this.healthService.getMinimalHealth().subscribe((data: any) => {
      this.healthData = data;
    });
  }

  prepareReadWriteRatio(chart) {
    const ratioLabels = [];
    const ratioData = [];

    const total =
      this.healthData.client_perf.write_op_per_sec + this.healthData.client_perf.read_op_per_sec;

    ratioLabels.push(
      `${this.i18n('Reads')}: ${this.dimless.transform(
        this.healthData.client_perf.read_op_per_sec
      )} ${this.i18n('/s')}`
    );
    ratioData.push(this.calcPercentage(this.healthData.client_perf.read_op_per_sec, total));
    ratioLabels.push(
      `${this.i18n('Writes')}: ${this.dimless.transform(
        this.healthData.client_perf.write_op_per_sec
      )} ${this.i18n('/s')}`
    );
    ratioData.push(this.calcPercentage(this.healthData.client_perf.write_op_per_sec, total));

    chart.labels = ratioLabels;
    chart.dataset[0].data = ratioData;
    chart.dataset[0].label = `${this.dimless.transform(total)}\n${this.i18n('IOPS')}`;
  }

  prepareClientThroughput(chart) {
    const ratioLabels = [];
    const ratioData = [];

    const total =
      this.healthData.client_perf.read_bytes_sec + this.healthData.client_perf.write_bytes_sec;

    ratioLabels.push(
      `${this.i18n('Reads')}: ${this.dimlessBinary.transform(
        this.healthData.client_perf.read_bytes_sec
      )}${this.i18n('/s')}`
    );
    ratioData.push(this.calcPercentage(this.healthData.client_perf.read_bytes_sec, total));
    ratioLabels.push(
      `${this.i18n('Writes')}: ${this.dimlessBinary.transform(
        this.healthData.client_perf.write_bytes_sec
      )}${this.i18n('/s')}`
    );
    ratioData.push(this.calcPercentage(this.healthData.client_perf.write_bytes_sec, total));

    chart.labels = ratioLabels;
    chart.dataset[0].data = ratioData;
    chart.dataset[0].label = `${this.dimlessBinary.transform(total).replace(' ', '\n')}${this.i18n(
      '/s'
    )}`;
  }

  prepareRawUsage(chart, data) {
    const percentAvailable = this.calcPercentage(
      data.df.stats.total_bytes - data.df.stats.total_used_raw_bytes,
      data.df.stats.total_bytes
    );
    const percentUsed = this.calcPercentage(
      data.df.stats.total_used_raw_bytes,
      data.df.stats.total_bytes
    );

    chart.dataset[0].data = [percentUsed, percentAvailable];

    chart.labels = [
      `${this.i18n('Used')}: ${this.dimlessBinary.transform(data.df.stats.total_used_raw_bytes)}`,
      `${this.i18n('Avail.')}: ${this.dimlessBinary.transform(
        data.df.stats.total_bytes - data.df.stats.total_used_raw_bytes
      )}`
    ];

    chart.dataset[0].label = `${percentUsed}%\nof ${this.dimlessBinary.transform(
      data.df.stats.total_bytes
    )}`;
  }

  preparePgStatus(chart, data) {
    const categoryPgAmount = {};

    let pg_total = 0;

    _.forEach(data.pg_info.statuses, (pgAmount, pgStatesText) => {
      const categoryType = this.pgCategoryService.getTypeByStates(pgStatesText);

      if (_.isUndefined(categoryPgAmount[categoryType])) {
        categoryPgAmount[categoryType] = 0;
      }
      categoryPgAmount[categoryType] += pgAmount;
      pg_total += pgAmount;
    });

    for (const categoryType of this.pgCategoryService.getAllTypes()) {
      if (_.isUndefined(categoryPgAmount[categoryType])) {
        categoryPgAmount[categoryType] = 0;
      }
    }

    chart.dataset[0].data = this.pgCategoryService
      .getAllTypes()
      .map((categoryType) => this.calcPercentage(categoryPgAmount[categoryType], pg_total));

    chart.labels = [
      `${this.i18n('Clean')}: ${this.dimless.transform(categoryPgAmount['clean'])}`,
      `${this.i18n('Working')}: ${this.dimless.transform(categoryPgAmount['working'])}`,
      `${this.i18n('Warning')}: ${this.dimless.transform(categoryPgAmount['warning'])}`,
      `${this.i18n('Unknown')}: ${this.dimless.transform(categoryPgAmount['unknown'])}`
    ];

    chart.dataset[0].label = `${pg_total}\n${this.i18n('PGs')}`;
  }

  prepareObjects(chart, data) {
    const totalReplicas = data.pg_info.object_stats.num_object_copies;
    const healthy =
      totalReplicas -
      data.pg_info.object_stats.num_objects_misplaced -
      data.pg_info.object_stats.num_objects_degraded -
      data.pg_info.object_stats.num_objects_unfound;

    chart.labels = [
      `${this.i18n('Healthy')}`,
      `${this.i18n('Misplaced')}`,
      `${this.i18n('Degraded')}`,
      `${this.i18n('Unfound')}`
    ];

    chart.dataset[0].data = [
      this.calcPercentage(healthy, totalReplicas),
      this.calcPercentage(data.pg_info.object_stats.num_objects_misplaced, totalReplicas),
      this.calcPercentage(data.pg_info.object_stats.num_objects_degraded, totalReplicas),
      this.calcPercentage(data.pg_info.object_stats.num_objects_unfound, totalReplicas)
    ];

    chart.dataset[0].label = `${this.dimless.transform(
      data.pg_info.object_stats.num_objects
    )}\n${this.i18n('objects')}`;

    // chart.options.maintainAspectRatio = window.innerWidth >= 375;
  }

  isClientReadWriteChartShowable() {
    const readOps = this.healthData.client_perf.read_op_per_sec || 0;
    const writeOps = this.healthData.client_perf.write_op_per_sec || 0;

    return readOps + writeOps > 0;
  }

  private calcPercentage(dividend: number, divisor: number) {
    if (!_.isNumber(dividend) || !_.isNumber(divisor) || divisor === 0) {
      return 0;
    }

    return Math.round((dividend / divisor) * 100);
  }
}
