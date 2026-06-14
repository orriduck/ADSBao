terraform {
  required_version = ">= 1.6.0"

  required_providers {
    newrelic = {
      source  = "newrelic/newrelic"
      version = "3.93.0"
    }
  }
}
