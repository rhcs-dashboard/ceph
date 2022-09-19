import { Component, Input, OnChanges, OnInit } from '@angular/core';

import { CssHelper } from '~/app/shared/classes/css-helper';

@Component({
  selector: 'cd-dashboard-area-chart',
  templateUrl: './dashboard-area-chart.component.html',
  styleUrls: ['./dashboard-area-chart.component.scss']
})
export class DashboardAreaChartComponent implements OnInit, OnChanges {
  @Input()
  chartTitle: string;
  @Input()
  dataUnits: string;
  @Input()
  data: any;

  currentData: any;

  chartData: any = {
    dataset: [
      {
        data: [{ x: 0, y: 0 }],
        backgroundColor: this.cssHelper.propertyValue('chart-color-translucent-blue'),
        borderColor: this.cssHelper.propertyValue('chart-color-strong-blue')
      }
    ]
  };

  options: any = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      point: {
        radius: 0
      }
    },
    legend: {
      display: false
    },
    tooltips: {
      mode: 'nearest',
      intersect: false,
      displayColors: false,
      backgroundColor: this.cssHelper.propertyValue('chart-color-tooltip-background'),
      callbacks: {
        title: function (): any {
          return null;
        }
      }
    },
    hover: {
      mode: 'nearest',
      intersect: false
    },
    scales: {
      xAxes: [
        {
          display: false,
          type: 'time',
          gridLines: {
            display: false
          }
        }
      ],
      yAxes: [
        {
          gridLines: {
            display: false
          },
          ticks: {
            beginAtZero: true,
            maxTicksLimit: 3,
            callback: (value: any) => {
                return $localize`${parseFloat(value.toFixed(3))}${this.dataUnits}`;
            }
          }
        }
      ]
    }
  };
  constructor(private cssHelper: CssHelper) {}

  ngOnInit(): void {
    this.currentData = Number(
      this.chartData.dataset[0].data[this.chartData.dataset[0].data.length - 1].y
    ).toFixed(3);
  }

  ngOnChanges(): void {
    if (this.data) {
      this.chartData.dataset[0].data = this.formatData(this.data);
    }
    this.currentData = Number(
      this.chartData.dataset[0].data[this.chartData.dataset[0].data.length - 1].y
    ).toFixed(3);
  }

  private formatData(array: Array<any>): any {
    let dictionary = {};
    if (this.dataUnits === 'TB') {
      dictionary = array.map((data: any) => ({ x: data[0], y: data[1] / 1000000000000 }));
    } else if (this.dataUnits === 'k') {
      dictionary = array.map((data: any) => ({ x: data[0], y: data[1] / 1000 }));
    } else {
      dictionary = array.map((data: any) => ({ x: data[0], y: data[1] }));
    }
    return dictionary;
  }
}
