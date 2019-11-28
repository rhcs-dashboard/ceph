import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChartsModule } from 'ng2-charts';

import { configureTestBed } from '../../../../testing/unit-test-helper';
import { CephfsChartComponent } from './cephfs-chart.component';

describe('CephfsChartComponent', () => {
  let component: CephfsChartComponent;
  let fixture: ComponentFixture<CephfsChartComponent>;

  const counter = [[0, 15], [5, 15], [10, 25], [15, 50]];

  configureTestBed({
    imports: [ChartsModule],
    declarations: [CephfsChartComponent]
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CephfsChartComponent);
    component = fixture.componentInstance;
    component.mdsCounter = {
      'mds_server.handle_client_request': counter,
      'mds_mem.ino': counter,
      name: 'a'
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
