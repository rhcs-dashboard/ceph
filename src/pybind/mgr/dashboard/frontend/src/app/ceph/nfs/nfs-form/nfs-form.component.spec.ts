import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule } from 'ngx-toastr';

import { LoadingPanelComponent } from '~/app/shared/components/loading-panel/loading-panel.component';
import { SharedModule } from '~/app/shared/shared.module';
import { ActivatedRouteStub } from '~/testing/activated-route-stub';
import { configureTestBed, RgwHelper } from '~/testing/unit-test-helper';
import { NfsFormClientComponent } from '../nfs-form-client/nfs-form-client.component';
import { NfsFormComponent } from './nfs-form.component';

describe('NfsFormComponent', () => {
  let component: NfsFormComponent;
  let fixture: ComponentFixture<NfsFormComponent>;
  let httpTesting: HttpTestingController;
  let activatedRoute: ActivatedRouteStub;

  configureTestBed(
    {
      declarations: [NfsFormComponent, NfsFormClientComponent],
      imports: [
        HttpClientTestingModule,
        ReactiveFormsModule,
        RouterTestingModule,
        SharedModule,
        ToastrModule.forRoot(),
        NgbTypeaheadModule
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: new ActivatedRouteStub({ cluster_id: undefined, export_id: undefined })
        }
      ]
    },
    [LoadingPanelComponent]
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(NfsFormComponent);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
    activatedRoute = <ActivatedRouteStub>TestBed.inject(ActivatedRoute);
    RgwHelper.selectDaemon();
    fixture.detectChanges();

    httpTesting.expectOne('ui-api/nfs-ganesha/fsals').flush(['CEPH', 'RGW']);
    httpTesting.expectOne('ui-api/nfs-ganesha/cephfs/filesystems').flush([{ id: 1, name: 'a' }]);
    httpTesting.expectOne('api/nfs-ganesha/cluster').flush(['mynfs']);
    httpTesting
      .expectOne(`api/rgw/user?${RgwHelper.DAEMON_QUERY_PARAM}`)
      .flush(['test', 'dev', 'tenant$user']);
    const user_dev = {
      suspended: 0,
      user_id: 'dev',
      keys: ['a']
    };
    httpTesting.expectOne(`api/rgw/user/dev?${RgwHelper.DAEMON_QUERY_PARAM}`).flush(user_dev);
    const user_test = {
      suspended: 1,
      user_id: 'test',
      keys: ['a']
    };
    httpTesting.expectOne(`api/rgw/user/test?${RgwHelper.DAEMON_QUERY_PARAM}`).flush(user_test);
    const tenantUser = {
      suspended: 0,
      tenant: 'tenant',
      user_id: 'user',
      keys: ['a']
    };
    httpTesting
      .expectOne(`api/rgw/user/tenant%24user?${RgwHelper.DAEMON_QUERY_PARAM}`)
      .flush(tenantUser);
    httpTesting.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should process all data', () => {
    expect(component.allFsals).toEqual([
      { descr: 'CephFS', value: 'CEPH' },
      { descr: 'Object Gateway', value: 'RGW' }
    ]);
    expect(component.allFsNames).toEqual([{ id: 1, name: 'a' }]);
    expect(component.allClusters).toEqual([{ cluster_id: 'mynfs' }]);
    expect(component.allRgwUsers).toEqual(['dev', 'tenant$user']);
  });

  it('should create the form', () => {
    expect(component.nfsForm.value).toEqual({
      access_type: 'RW',
      clients: [],
      cluster_id: '',
      fsal: { fs_name: 'a', name: '', rgw_user_id: '' },
      path: '/',
      protocolNfsv4: true,
      pseudo: '',
      sec_label_xattr: 'security.selinux',
      security_label: false,
      squash: '',
      transportTCP: true,
      transportUDP: true
    });
    expect(component.nfsForm.get('cluster_id').disabled).toBeFalsy();
  });

  it('should prepare data when selecting an cluster', () => {
    component.nfsForm.patchValue({ cluster_id: 'cluster1' });

    component.nfsForm.patchValue({ cluster_id: 'cluster2' });
  });

  it('should not allow changing cluster in edit mode', () => {
    component.isEdit = true;
    component.ngOnInit();
    expect(component.nfsForm.get('cluster_id').disabled).toBeTruthy();
  });

  it('should mark NFSv4 protocol as enabled always', () => {
    expect(component.nfsForm.get('protocolNfsv4')).toBeTruthy();
  });

  describe('should submit request', () => {
    beforeEach(() => {
      component.nfsForm.patchValue({
        access_type: 'RW',
        clients: [],
        cluster_id: 'cluster1',
        fsal: { name: 'CEPH', fs_name: 1, rgw_user_id: '' },
        path: '/foo',
        protocolNfsv4: true,
        pseudo: '/baz',
        squash: 'no_root_squash',
        transportTCP: true,
        transportUDP: true
      });
    });

    it('should call update', () => {
      activatedRoute.setParams({ cluster_id: 'cluster1', export_id: '1' });
      component.isEdit = true;
      component.cluster_id = 'cluster1';
      component.export_id = '1';
      component.nfsForm.patchValue({ export_id: 1 });
      component.submitAction();

      const req = httpTesting.expectOne('api/nfs-ganesha/export/cluster1/1');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({
        access_type: 'RW',
        clients: [],
        cluster_id: 'cluster1',
        export_id: 1,
        fsal: { fs_name: 1, name: 'CEPH', sec_label_xattr: null },
        path: '/foo',
        protocols: [4],
        pseudo: '/baz',
        security_label: false,
        squash: 'no_root_squash',
        transports: ['TCP', 'UDP']
      });
    });

    it('should call create', () => {
      activatedRoute.setParams({ cluster_id: undefined, export_id: undefined });
      component.submitAction();

      const req = httpTesting.expectOne('api/nfs-ganesha/export');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        access_type: 'RW',
        clients: [],
        cluster_id: 'cluster1',
        fsal: {
          fs_name: 1,
          name: 'CEPH',
          sec_label_xattr: null
        },
        path: '/foo',
        protocols: [4],
        pseudo: '/baz',
        security_label: false,
        squash: 'no_root_squash',
        transports: ['TCP', 'UDP']
      });
    });
  });
});
