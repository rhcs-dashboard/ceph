import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { NgbNavModule, NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { ChartsModule } from 'ng2-charts';

import { SharedModule } from '~/app/shared/shared.module';
import { CephSharedModule } from '../shared/ceph-shared.module';
import { CardComponent } from './card/card.component';
import { DashboardAreaChartComponent } from './dashboard-area-chart/dashboard-area-chart.component';
import { DashboardPieComponent } from './dashboard-pie/dashboard-pie.component';
import { DashboardTimeSelectorComponent } from './dashboard-time-selector/dashboard-time-selector.component';
import { DashboardComponent } from './dashboard/dashboard.component';

@NgModule({
  imports: [
    CephSharedModule,
    CommonModule,
    NgbNavModule,
    SharedModule,
    ChartsModule,
    RouterModule,
    NgbPopoverModule,
    FormsModule,
    ReactiveFormsModule
  ],

  declarations: [
    DashboardComponent,
    CardComponent,
    DashboardPieComponent,
    DashboardAreaChartComponent,
    DashboardTimeSelectorComponent
  ]
})
export class NewDashboardModule {}
