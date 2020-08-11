import { Injectable } from '@angular/core';

import { BehaviorSubject, Subscription } from 'rxjs';
import { filter, first, map } from 'rxjs/operators';

import { CephReleaseNamePipe } from '../pipes/ceph-release-name.pipe';
import { SummaryService } from './summary.service';

@Injectable({
  providedIn: 'root'
})
export class DocService {
  private releaseDataSource = new BehaviorSubject<string>(null);
  releaseData$ = this.releaseDataSource.asObservable();

  constructor(
    private summaryservice: SummaryService,
    private cephReleaseNamePipe: CephReleaseNamePipe
  ) {
    this.summaryservice.subscribeOnce((summary) => {
      const releaseName = this.cephReleaseNamePipe.transform(summary.version);
      this.releaseDataSource.next(releaseName);
    });
  }

  urlGenerator(section: string, release = 'reef'): string {
    const docVersion = release === 'reef' ? '7' : release;
    const domain = `https://access.redhat.com/documentation/en-us/red_hat_ceph_storage/${docVersion}/html/`;
    const domainRedHat = `https://www.redhat.com/en/about/`;

    const sections = {
      iscsi: `${domain}dashboard_guide/management-of-block-devices-using-the-ceph-dashboard#management-of-iscsi-functions-on-the-ceph-dashboard`,
      prometheus: `${domain}dashboard_guide/management-of-alerts-on-the-ceph-dashboard`,
      'nfs-ganesha': `${domain}dashboard_guide/management-of-nfs-ganesha-exports-on-the-ceph-dashboard#configuring-nfs-ganesha-daemons-on-the-ceph-dashboard_dash`,
      'rgw-nfs': `${domain}dashboard_guide/management-of-nfs-ganesha-exports-on-the-ceph-dashboard`,
      rgw: `${domain}dashboard_guide/management-of-ceph-object-gateway-using-the-dashboard`,
      dashboard: `${domain}dashboard_guide/`,
      grafana: `${domain}dashboard_guide/management-of-alerts-on-the-ceph-dashboard#enabling-monitoring-stack_dash`,
      orch: `${domain}operations_guide/introduction-to-the-ceph-orchestrator`,
      pgs: `https://access.redhat.com/labs/cephpgc/`,
      help: `https://access.redhat.com/documentation/en-us/red_hat_ceph_storage/`,
      terms: `${domainRedHat}all-policies-guidelines/`,
      privacy: `${domainRedHat}privacy-policy/`,
      'dashboard-landing-page-status': `${domain}dashboard_guide/index#understanding-the-landing-page_dash`,
      'dashboard-landing-page-performance': `${domain}dashboard_guide/index#understanding-the-landing-page_dash`,
      'dashboard-landing-page-capacity': `${domain}dashboard_guide/index#understanding-the-landing-page_dash`
    };

    return sections[section];
  }

  subscribeOnce(
    section: string,
    next: (release: string) => void,
    error?: (error: any) => void
  ): Subscription {
    return this.releaseData$
      .pipe(
        filter((value) => !!value),
        map((release) => this.urlGenerator(section, release)),
        first()
      )
      .subscribe(next, error);
  }
}
