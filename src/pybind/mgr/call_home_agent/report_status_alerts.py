from .report import Report, ReportTimes, EventGeneric
from .prometheus import Prometheus
import time
import json
import requests
from typing import Optional

class ReportStatusAlerts(Report):

    # Prometheus API returns all alerts. We want to send only deltas in the alerts
    # report - i.e. send a *new* alert that has been fired since the last report
    # was sent, and send a “resolved” notification when an alert is removed from
    # the prometheus API.
    # To do so we keep a list of alerts (“sent_alerts”) we have already sent, and
    # use that to create a delta report in generate_alerts_report(). The alert
    # report is not sent if there are no deltas.
    # `ceph callhome reset alerts` zeros out sent_alerts list and therefore the
    # next report will contain the relevant alerts that are fetched from the
    # Prometheus API.
    sent_alerts = {}

    def __init__(self, agent) -> None:
        super().__init__(agent, 'status')

    def compile(self) -> Optional[dict]:
        report_times = ReportTimes()
        report = self.get_report_headers(report_times)
        event = EventStatusAlerts(self.agent).generate(report_times)
        # If there are no alerts to send then return and dont send the report
        if not event.has_content:
            return None

        report['events'].append(event.data)
        return report
        #self.send(report)

    @staticmethod
    def resetAlerts(mock: bool = False):
        if mock:
            # If there are no relevant alerts in the cluster, an "alerts" report will not be sent.
            # "mock" is useful in this case, to allow the user to send a dummy "alerts" report to Call Home.
            mocked_alert = {'labels': {'label': 'test'}, 'activeAt': '42', 'value': '17'}
            sent_alerts = {alert_uid(mocked_alert): mocked_alert}
        else:
            sent_alerts = {}

class EventStatusAlerts(EventGeneric):
    def generate(self, report_times: ReportTimes) -> None:
        super().generate('status', 'ceph_alerts', 'Ceph cluster alerts', report_times)

        self.data["body"]["event_transaction_id"] = f"IBM_event_RedHatMarine_ceph_{self.agent.ceph_cluster_id}_{report_times.time_ms}_status_event"
        self.data["body"]["complete"] = True

        # if the status event contains alerts we add a boolean in the body to help with analytics
        self.data["body"]["alert"] =  True
        # Call Home requires the 'state' attribute in the 'body' section
        self.data["body"]["state"] = "Ok"
        content = self.gather()
        self.has_content = bool(content)
        self.set_content(content)
        return self

    def gather(self) -> dict:
        # Filter the alert list
        current_alerts_list = list(filter(self.is_alert_relevant, self.get_prometheus_alerts()))

        current_alerts = {self.alert_uid(a):a for a in current_alerts_list}
        # Find all new alerts - alerts that are currently active but were not sent until now (not in sent_alerts)
        new_alerts = [a for uid, a in current_alerts.items() if uid not in ReportStatusAlerts.sent_alerts]
        resolved_alerts = [a for uid, a in ReportStatusAlerts.sent_alerts.items() if uid not in current_alerts]

        ReportStatusAlerts.sent_alerts = current_alerts
        if len(new_alerts) == 0 and len(resolved_alerts) == 0:
            return None  # This will prevent the report from being sent
        alerts_to_send = {'new_alerts': new_alerts, 'resolved_alerts': resolved_alerts}
        return alerts_to_send

    def alert_uid(self, alert: dict) -> str:
        """
        Retuns a unique string identifying this alert
        """
        return json.dumps(alert['labels'], sort_keys=True) + alert['activeAt'] + alert['value']

    def is_alert_relevant(self, alert: dict) -> bool:
        """
        Returns True if this alert should be sent, False if it should be filtered out of the report
        """
        state = alert.get('state', '')
        severity = alert.get('labels', {}).get('severity', '')

        return state == 'firing' and severity == 'critical'

    def get_prometheus_alerts(self):
        """
        Returns a list of all the alerts currently active in Prometheus
        """
        try:
            prometheus = Prometheus(self.agent)
            resp = prometheus.get("alerts")
            if 'data' not in resp or 'alerts' not in resp['data']:
                raise Exception(f"Prometheus returned a bad reply: {resp}")

            alerts = resp['data']['alerts']
            return alerts
        except Exception as e:
            self.agent.log.error(f"Can't fetch alerts from Prometheus: {e}")
            return [{
                    'labels': {
                        'alertname': 'callhomeErrorFetchPrometheus',
                        'severity': 'critical'
                    },
                    'annotations': {
                        'description': str(e)
                    },
                    'state': 'firing',
                    # 'activeAt' and 'value' are here for alert_uid() to work. They should be '0' so that we won't send this alert again and again
                    'activeAt': '0',
                    'value': '0'
                }]

