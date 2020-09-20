#!/usr/bin/env groovy

pipeline {
    agent {
      label 'huge && bionic && x86_64 && !xenial && !trusty'
    }
    environment {
        NPROC = "0"
    }

    stages {
        stage('Prepare') {
            steps {
                sh '''
                source run-make-check.sh
                FOR_MAKE_CHECK=1 prepare
                '''
            }
        }

        stage('Build') {
            steps {
              sh '''
              source run-make-check.sh
              configure
              build tests
              '''
            }
        }

        stage('Test') {
            steps {
              sh '''
              source run-make-check.sh
              run
              '''
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
