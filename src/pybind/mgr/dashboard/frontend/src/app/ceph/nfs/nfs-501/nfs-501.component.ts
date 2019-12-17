import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { I18n } from '@ngx-translate/i18n-polyfill';

import { DocUrls } from '../../../shared/constants/app.constants';
import { CephReleaseNamePipe } from '../../../shared/pipes/ceph-release-name.pipe';
import { SummaryService } from '../../../shared/services/summary.service';

@Component({
  selector: 'cd-nfs-501',
  templateUrl: './nfs-501.component.html',
  styleUrls: ['./nfs-501.component.scss']
})
export class Nfs501Component implements OnInit, OnDestroy {
  docsUrl: string;
  message = this.i18n('The NFS Ganesha service is not configured.');
  routeParamsSubscribe: any;

  constructor(
    private route: ActivatedRoute,
    private summaryService: SummaryService,
    private cephReleaseNamePipe: CephReleaseNamePipe,
    private i18n: I18n
  ) {}

  ngOnInit() {
    const subs = this.summaryService.subscribe((summary: any) => {
      if (!summary) {
        return;
      }

      // @ts-ignore
      const releaseName = this.cephReleaseNamePipe.transform(summary.version);
      this.docsUrl = DocUrls.nfs;

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
