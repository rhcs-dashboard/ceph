import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';

import { MgrModuleService } from '~/app/shared/api/mgr-module.service';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import { DocService } from '~/app/shared/services/doc.service';
import { NotificationService } from '~/app/shared/services/notification.service';
import { ModuleStatusPromptComponent } from './module-status-prompt.component';

describe('ModuleStatusPromptComponent', () => {
  let fixture: ComponentFixture<ModuleStatusPromptComponent>;
  let component: ModuleStatusPromptComponent;
  let http: HttpTestingController;
  const router = { navigate: jest.fn(), navigateByUrl: jest.fn() };
  const mgrModuleService = { updateModuleState: jest.fn() };

  const routeData = {
    moduleStatusGuardConfig: {
      uiApiPath: 'iscsi',
      header: 'iSCSI is not configured',
      button_name: 'Create iSCSI service',
      button_route: '/services/create/iscsi',
      module_name: 'iscsi',
      navigate_to: 'block/iscsi'
    }
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [ModuleStatusPromptComponent, HttpClientTestingModule],
      providers: [
        { provide: Router, useValue: router },
        { provide: MgrModuleService, useValue: mgrModuleService },
        {
          provide: AuthStorageService,
          useValue: { getPermissions: () => ({ configOpt: { update: true } }) }
        },
        { provide: DocService, useValue: { urlGenerator: () => 'https://docs.ceph.com' } },
        { provide: NotificationService, useValue: { show: jest.fn() } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: routeData } }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ModuleStatusPromptComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  function loadStatus(body: object): void {
    fixture.detectChanges();
    const request = http.expectOne('ui-api/iscsi/status');
    request.flush(body);
    fixture.detectChanges();
  }

  it('shows Enable on the page when the manager module is disabled', () => {
    loadStatus({
      available: false,
      reason: 'module_disabled',
      module: 'smb',
      message: 'SMB module is not enabled'
    });

    expect(component.mode).toBe('enable');
    expect(component.buttonLabel).toBe('Enable SMB');
    const button = fixture.nativeElement.querySelector('button');
    expect(button.textContent).toContain('Enable SMB');

    button.click();
    expect(mgrModuleService.updateModuleState).toHaveBeenCalledWith(
      ['smb'],
      false,
      null,
      'block/iscsi',
      expect.any(String),
      true,
      expect.any(String)
    );
  });

  it('links to service creation when the module is enabled but nothing is deployed', () => {
    loadStatus({
      available: false,
      reason: 'not_configured',
      module: 'iscsi',
      message: 'There are no gateways defined'
    });

    expect(component.mode).toBe('link');
    expect(component.buttonLabel).toBe('Create iSCSI service');
    fixture.nativeElement.querySelector('button').click();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/services/create/iscsi');
  });

  it('returns to the section when status becomes available', () => {
    loadStatus({ available: true, message: null });
    expect(router.navigate).toHaveBeenCalledWith(['block/iscsi']);
  });

  it('hides Enable when the user cannot update configuration', () => {
    const auth = TestBed.inject(AuthStorageService);
    jest.spyOn(auth, 'getPermissions').mockReturnValue({ configOpt: { update: false } } as any);
    component.canEnable = false;
    loadStatus({
      available: false,
      reason: 'module_disabled',
      module: 'smb',
      message: 'SMB module is not enabled'
    });

    expect(component.mode).toBe('enable');
    expect(fixture.nativeElement.textContent).toContain(
      'An administrator with configuration access can enable this module.'
    );
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
});
