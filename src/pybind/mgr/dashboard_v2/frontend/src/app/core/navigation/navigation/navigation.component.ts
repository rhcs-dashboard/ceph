import { Component, OnInit } from '@angular/core';
import { SummaryService } from '../../../shared/services/summary.service';
import { detect } from 'detect-browser';

@Component({
  selector: 'cd-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit {
  hostName: string;
  browserOS: any;
  browserName: string;
  browserVersion: any;
  user: string;
  summaryData: any;
  rbdPools: Array<any> = [];

  constructor(private summaryService: SummaryService) {}

  ngOnInit() {
    this.summaryService.summaryData$.subscribe((data: any) => {
      this.summaryData = data;
      this.rbdPools = data.rbd_pools;
    });
    this.user = localStorage.getItem('dashboard_username');
    this.browserName = detect().name;
    this.browserVersion = detect().version;
    this.browserOS = detect().os;
    this.hostName = "Host";
  }

  blockHealthColor() {
    if (this.summaryData && this.summaryData.rbd_mirroring) {
      if (this.summaryData.rbd_mirroring.errors > 0) {
        return { color: '#d9534f' };
      } else if (this.summaryData.rbd_mirroring.warnings > 0) {
        return { color: '#f0ad4e' };
      }
    }
  }
}
