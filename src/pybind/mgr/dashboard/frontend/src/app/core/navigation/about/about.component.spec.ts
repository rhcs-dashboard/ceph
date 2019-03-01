import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsModalRef } from 'ngx-bootstrap/modal';
import { BehaviorSubject } from 'rxjs';

import { configureTestBed } from '../../../../testing/unit-test-helper';
import { SummaryService } from '../../../shared/services/summary.service';
import { SharedModule } from '../../../shared/shared.module';
import { AboutComponent } from './about.component';

export class SummaryServiceMock {
  summaryDataSource = new BehaviorSubject({
    mgr_host: 'http://localhost:11000/'
  });
  summaryData$ = this.summaryDataSource.asObservable();

  subscribe(call) {
    return this.summaryData$.subscribe(call);
  }
}

describe('AboutComponent', () => {
  let component: AboutComponent;
  let fixture: ComponentFixture<AboutComponent>;

  configureTestBed({
    imports: [SharedModule, HttpClientTestingModule],
    declarations: [AboutComponent],
    providers: [BsModalRef, { provide: SummaryService, useClass: SummaryServiceMock }]
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AboutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should get host', () => {
    expect(component.hostAddr).toBe('localhost:11000');
  });
});
