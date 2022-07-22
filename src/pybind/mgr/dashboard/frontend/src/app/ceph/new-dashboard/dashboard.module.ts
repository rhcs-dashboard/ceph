import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { NgbNavModule, NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { ChartsModule } from 'ng2-charts';

import { SharedModule } from '~/app/shared/shared.module';
import { CephSharedModule } from '../shared/ceph-shared.module';
import { CardComponent } from './card/card.component';
<<<<<<< HEAD
import { DashboardPieComponent } from './dashboard-pie/dashboard-pie.component';
=======
>>>>>>> 59d734f8b53 (mgr/dashboard: changes to first layout)
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

<<<<<<< HEAD
  declarations: [DashboardComponent, CardComponent, DashboardPieComponent]
=======
  declarations: [DashboardComponent, CardComponent]
>>>>>>> 59d734f8b53 (mgr/dashboard: changes to first layout)
})
export class NewDashboardModule {}
