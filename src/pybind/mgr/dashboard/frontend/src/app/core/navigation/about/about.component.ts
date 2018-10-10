import { Component, OnDestroy, OnInit } from '@angular/core';

import { BsModalRef } from 'ngx-bootstrap';
import { Subscription } from 'rxjs';

import { detect } from 'detect-browser';

import { SummaryService } from '../../../shared/services/summary.service';

@Component({
  selector: 'cd-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit, OnDestroy {
  versionNumber: string;
  versionHash: string;
  versionName: string;
  subs: Subscription;
  hostName: string;
  browserOS: any;
  browserName: string;
  browserVersion: any;
  user: string;

  constructor(public modalRef: BsModalRef, private summaryService: SummaryService) {}

  ngOnInit() {
    this.subs = this.summaryService.subscribe((summary: any) => {
      if (!summary) {
        return;
      }
      const version = summary.version.replace('ceph version ', '').split(' ');
      this.versionNumber = version[0];
      this.versionHash = version[1];
      this.versionName = version.slice(2, version.length).join(' ');
    });
    this.user = localStorage.getItem('dashboard_username');
    this.browserName = detect().name;
    this.browserVersion = detect().version;
    this.browserOS = detect().os;
    this.hostName = "Host";
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
