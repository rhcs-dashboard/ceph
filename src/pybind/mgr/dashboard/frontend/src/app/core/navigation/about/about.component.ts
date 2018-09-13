import { Component, OnDestroy, OnInit } from '@angular/core';

import { BsModalRef } from 'ngx-bootstrap';
import { Subscription } from 'rxjs';

import { SummaryService } from '../../../shared/services/summary.service';
import { DashboardService } from '../../../shared/api/dashboard.service';
import { detect } from 'detect-browser';

@Component({
  selector: 'cd-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit, OnDestroy {
  hostName: string;
  browserOS: any;
  browserName: string;
  browserVersion: any;
  user: string;
  versionNumber: string;
  versionHash: string;
  versionName: string;
  subs: Subscription;

  constructor(public modalRef: BsModalRef, private summaryService: SummaryService,
  private dashboardService: DashboardService) {}

  ngOnInit() {
    this.subs = this.summaryService.subscribe((summary: any) => {
      if (!summary) {
        return;
      }
      const version = summary.version.replace('ceph version ', '').split(' ');
      this.versionNumber = version[0];
      this.versionHash = version[1];
      this.versionName = version.slice(2, version.length).join(' ');
      this.user = localStorage.getItem('dashboard_username');
      this.browserName = detect().name;
      this.browserVersion = detect().version;
      this.browserOS = detect().os;
    });

    this.subs = this.dashboardService.getHealth().subscribe((health: any) => {
      if (!health) {
        return;
      }
      this.hostName = health.mgr_map.services.dashboard;      
    });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
