import { Component, EventEmitter, Output } from '@angular/core';

import moment from 'moment';

@Component({
  selector: 'cd-dashboard-time-selector',
  templateUrl: './dashboard-time-selector.component.html',
  styleUrls: ['./dashboard-time-selector.component.scss']
})
export class DashboardTimeSelectorComponent {
  @Output()
  selectedTime = new EventEmitter<any>();

  times: any;
  time: any;

  constructor() {
    this.times = [
      {
        name: $localize`Last 5 minutes`,
        value: this.timeToDate(moment().unix() - 5 * 60)
      },
      {
        name: $localize`Last 15 minutes`,
        value: this.timeToDate(moment().unix() - 15 * 60)
      },
      {
        name: $localize`Last 30 minutes`,
        value: this.timeToDate(moment().unix() - 30 * 60)
      },
      {
        name: $localize`Last 1 hour`,
        value: this.timeToDate(moment().unix() - 3600)
      },
      {
        name: $localize`Last 3 hours`,
        value: this.timeToDate(moment().unix() - 3 * 3600)
      },
      {
        name: $localize`Last 6 hours`,
        value: this.timeToDate(moment().unix() - 6 * 3600)
      },
      {
        name: $localize`Last 12 hours`,
        value: this.timeToDate(moment().unix() - 12 * 3600)
      },
      {
        name: $localize`Last 24 hours`,
        value: this.timeToDate(moment().unix() - 24 * 3600)
      },
      {
        name: $localize`Last 2 days`,
        value: this.timeToDate(moment().unix() - 48 * 3600)
      },
      {
        name: $localize`Last 7 days`,
        value: this.timeToDate(moment().unix() - 168 * 3600)
      }
    ];
    this.time = this.times[0].value;
  }

  emitTime() {
    this.selectedTime.emit(this.time);
  }

  private timeToDate(unixTimeStamp: number): any {
    const date: Date = new Date(unixTimeStamp * 1000);
    const dateNow: Date = new Date();
    const formattedDate: any = {
      start: date.toISOString(),
      end: dateNow.toISOString(),
      step: (moment().unix() - unixTimeStamp) / 250
    };
    return formattedDate;
  }
}
