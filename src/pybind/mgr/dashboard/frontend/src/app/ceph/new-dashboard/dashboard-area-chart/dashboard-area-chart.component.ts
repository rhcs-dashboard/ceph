import { Component, Input, OnChanges, OnInit } from '@angular/core';

import { CssHelper } from '~/app/shared/classes/css-helper';
import { DimlessBinaryPipe } from '~/app/shared/pipes/dimless-binary.pipe';

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
  @Input()
  data2?: any;
  @Input()
  label1: any;
  @Input()
  label2?: any;

  currentData: number;

  chartData: any = {
    dataset: [
      {
        label: '',
        data: [{ x: 0, y: 0 }],
        backgroundColor: this.cssHelper.propertyValue('chart-color-translucent-blue'),
        borderColor: this.cssHelper.propertyValue('chart-color-strong-blue'),
        fill: true,
        lineTension: 0,
      },
      {
        label: '',
        data: [],
        backgroundColor: this.cssHelper.propertyValue('chart-color-yellow'),
        borderColor: this.cssHelper.propertyValue('chart-color-orange'),
        fill: true,   
        lineTension: 0,
      }
    ]
  };

  

  options: any = {
    responsive: true,
    maintainAspectRatio: false,
    legend: {
      display: false,
      position: "bottom",
      labels: {
        fontColor: "#333",
        fontSize: 4
      }
    },
    elements: {
      point: {
        radius: 0
      }
    },
    tooltips: {
      mode: 'nearest',
      yAlign: 100,
      intersect: false,
      displayColors: true,
      backgroundColor: this.cssHelper.propertyValue('chart-color-tooltip-background'),
      callbacks: {
        title: function (tooltipItem: any): any {
          return tooltipItem[0].yLabel + ' ' + tooltipItem[0].xLabel;
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
          },
          time: {
            tooltipFormat:'YYYY/MM/DD hh:mm:ss'
          }
        }
      ],
      y: [
        {
          gridLines: {
            display: false
          },
          ticks: {
            callback: (value: any) => {
              if (value === 0) {
                return null;
              }
              return $localize`${parseFloat(value.toFixed(3))}${this.dataUnits}`;
            }
          }
        }
      ]
    }
  };
  constructor(private cssHelper: CssHelper, private dimlessBinary: DimlessBinaryPipe) {}

  ngOnInit(): void {
    this.currentData = Number(
      this.chartData.dataset[0].data[this.chartData.dataset[0].data.length - 1].y
    );
  }

  ngOnChanges(): void {
    if (this.data) {
      this.chartData.dataset[0].data = this.formatData(this.data);
      this.chartData.dataset[0].label = this.label1;
    }
    if (this.data2) {
      this.chartData.dataset[1].data = this.formatData(this.data2);
      this.chartData.dataset[1].label = this.label2;
    }
    this.currentData = Number(
      this.chartData.dataset[0].data[this.chartData.dataset[0].data.length - 1].y
    );
  }

  private formatData(array: Array<any>): any {
    let dictionary = {};
    if (this.dataUnits === 'TB') {
      dictionary = array.map((data: any) => ({
        x: data[0] * 1000,
        y: Number(this.dimlessBinary.transform(data[1]).replace(/\D/g, ''))
      }));
    } else if (this.dataUnits === 'k') {
      dictionary = array.map((data: any) => ({ x: data[0] * 1000, y: data[1] }));
    } else if (this.dataUnits === 'ms') {
      dictionary = array.map((data: any) => ({ x: data[0] * 1000, y: data[1] }));
    } else {
      dictionary = array.map((data: any) => ({ x: data[0] * 1000, y: data[1] }));
    }
    return dictionary;
  }
}
