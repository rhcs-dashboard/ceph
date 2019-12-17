import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { DocUrls } from '../../../shared/constants/app.constants';
import { CephReleaseNamePipe } from '../../../shared/pipes/ceph-release-name.pipe';
import { SummaryService } from '../../../shared/services/summary.service';

@Component({
  selector: 'cd-rgw-501',
  templateUrl: './rgw-501.component.html',
  styleUrls: ['./rgw-501.component.scss']
})
export class Rgw501Component implements OnInit, OnDestroy {
  docsUrl: string;
  message = 'The Object Gateway service is not configured.';
  routeParamsSubscribe: any;

  constructor(
    private route: ActivatedRoute,
    private summaryService: SummaryService,
    private cephReleaseNamePipe: CephReleaseNamePipe
  ) {}

  ngOnInit() {
    const subs = this.summaryService.subscribe((summary: any) => {
      if (!summary) {
        return;
      }

      // @ts-ignore
      const releaseName = this.cephReleaseNamePipe.transform(summary.version);
      this.docsUrl = DocUrls.rgw;
      setTimeout(() => {
        subs.unsubscribe();
      }, 0);
    });

    this.routeParamsSubscribe = this.route.params.subscribe((params: { message: string }) => {
      this.message = params.message;
    });
  }

  ngOnDestroy() {
    this.routeParamsSubscribe.unsubscribe();
  }
}
