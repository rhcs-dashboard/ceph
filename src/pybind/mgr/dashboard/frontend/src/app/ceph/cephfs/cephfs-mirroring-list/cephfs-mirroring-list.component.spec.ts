import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { CephfsMirroringListComponent } from './cephfs-mirroring-list.component';
import { CephfsService } from '~/app/shared/api/cephfs.service';
import { Daemon, MirroringRow } from '~/app/shared/models/cephfs.model';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import { CdTableSelection } from '~/app/shared/models/cd-table-selection';
import { Permission } from '~/app/shared/models/permissions';

describe('CephfsMirroringListComponent', () => {
  let component: CephfsMirroringListComponent;
  let fixture: ComponentFixture<CephfsMirroringListComponent>;
  let routerNavigateSpy: jest.Mock;

  const cephfsServiceMock = {
    listDaemonStatus: jest.fn(),
    getMirrorStatus: jest.fn()
  };

  const authStorageServiceMock = {
    getPermissions: jest.fn().mockReturnValue({ cephfsMirror: {} as Permission })
  };

  const defaultMetrics = {
    daemon_status: 'running',
    bytes_replicated: '-',
    sync_path: '',
    sync_snap: '',
    last_sync: null
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    routerNavigateSpy = jest.fn();
    cephfsServiceMock.getMirrorStatus.mockReturnValue(of({}));

    await TestBed.configureTestingModule({
      declarations: [CephfsMirroringListComponent],
      providers: [
        { provide: CephfsService, useValue: cephfsServiceMock },
        { provide: AuthStorageService, useValue: authStorageServiceMock },
        {
          provide: Router,
          useValue: {
            navigate: routerNavigateSpy,
            url: '/cephfs/mirroring',
            events: of()
          }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(CephfsMirroringListComponent);
    component = fixture.componentInstance;
  });

  it('should initialize columns correctly on ngOnInit', () => {
    cephfsServiceMock.listDaemonStatus.mockReturnValue(of([]));
    component.ngOnInit();

    expect(component.jumpInTiles.length).toBe(2);
    expect(component.columns.length).toBe(6);
    expect(component.columns[0].prop).toBe('local_fs_name');
    expect(component.columns[2].prop).toBe('daemon_status');
  });

  it('should load daemon status on ngOnInit', () => {
    cephfsServiceMock.listDaemonStatus.mockReturnValue(of([]));
    component.daemonStatus$.subscribe();
    component.ngOnInit();
    expect(cephfsServiceMock.listDaemonStatus).toHaveBeenCalledTimes(1);
  });

  it('should fetch daemon status when loadDaemonStatus() is called', () => {
    cephfsServiceMock.listDaemonStatus.mockReturnValue(of([]));
    component.daemonStatus$.subscribe();
    component.loadDaemonStatus();
    expect(cephfsServiceMock.listDaemonStatus).toHaveBeenCalledTimes(1);
  });

  it('should map daemon status to MirroringRow[] correctly', () => {
    const mockData: Daemon[] = [
      {
        daemon_id: 1,
        filesystems: [
          {
            filesystem_id: 10,
            name: 'fs1',
            directory_count: 3,
            peers: [
              {
                remote: {
                  cluster_name: 'clusterA',
                  fs_name: 'fsA',
                  client_name: 'clientA'
                },
                uuid: 'peer-uuid',
                stats: undefined
              }
            ],
            id: ''
          }
        ]
      }
    ];

    cephfsServiceMock.listDaemonStatus.mockReturnValue(of(mockData));
    cephfsServiceMock.getMirrorStatus.mockReturnValue(
      of({
        metrics: {
          '/dir': {
            peer: {
              'peer-uuid': {
                last_synced_snap: {
                  name: 'snap1',
                  sync_bytes: '1.00 KiB',
                  sync_time_stamp: '1s'
                },
                metrics_updated_at: 1_700_000_000
              }
            }
          }
        }
      })
    );

    let emitted: MirroringRow[] = [];

    component.ngOnInit();
    component.daemonStatus$.subscribe((v) => (emitted = v || []));
    component.loadDaemonStatus();

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual({
      remote_cluster_name: 'clusterA',
      local_fs_name: 'fs1',
      fs_name: 'fsA',
      client_name: 'clientA',
      directory_count: 3,
      filesystem_id: 10,
      peer_uuid: 'peer-uuid',
      id: '1-10-peer-uuid',
      daemon_status: 'running',
      bytes_replicated: '1.00 KiB',
      sync_path: '/dir',
      sync_snap: 'snap1',
      last_sync: null
    });
    expect(cephfsServiceMock.getMirrorStatus).toHaveBeenCalledWith('fs1', undefined, 'peer-uuid');
  });

  it('should handle empty peers and map "-" values', () => {
    const mockData: Daemon[] = [
      {
        daemon_id: 2,
        filesystems: [
          {
            filesystem_id: 20,
            name: 'fs2',
            directory_count: 5,
            peers: [],
            id: ''
          }
        ]
      }
    ];

    cephfsServiceMock.listDaemonStatus.mockReturnValue(of(mockData));

    let emitted: MirroringRow[] = [];

    component.ngOnInit();
    component.daemonStatus$.subscribe((v) => (emitted = v || []));
    component.loadDaemonStatus();

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual({
      remote_cluster_name: '-',
      local_fs_name: 'fs2',
      fs_name: 'fs2',
      client_name: '-',
      directory_count: 5,
      filesystem_id: 20,
      peerId: '-',
      id: '2-20',
      ...defaultMetrics
    });
    expect(cephfsServiceMock.getMirrorStatus).not.toHaveBeenCalled();
  });

  it('should not navigate to add path modal when filesystem_id is missing', () => {
    component.selection = new CdTableSelection([{ local_fs_name: 'fs1' } as MirroringRow]);

    component.openAddPath();

    expect(routerNavigateSpy).not.toHaveBeenCalled();
  });

  it('should navigate to add path modal outlet when a filesystem is selected', () => {
    component.selection = new CdTableSelection([
      { local_fs_name: 'fs1', filesystem_id: 10 } as MirroringRow
    ]);

    component.openAddPath();

    expect(routerNavigateSpy).toHaveBeenCalledWith([
      '/cephfs/mirroring',
      {
        outlets: {
          modal: ['add-path', 10, encodeURIComponent('fs1')]
        }
      }
    ]);
  });
});
