import { HttpClientModule } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { inject } from '@angular/core/testing';

import { configureTestBed } from '../unit-test-helper';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  configureTestBed({
    providers: [DashboardService],
    imports: [HttpClientTestingModule, HttpClientModule]
  });

  it(
    'should be created',
    inject([DashboardService], (service: DashboardService) => {
      expect(service).toBeTruthy();
    })
  );
});
