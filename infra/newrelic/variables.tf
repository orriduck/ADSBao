variable "new_relic_account_id" {
  description = "New Relic account ID that receives ADSBao telemetry."
  type        = number
}

variable "new_relic_api_key" {
  description = "New Relic user API key for managing alerts."
  type        = string
  sensitive   = true
}

variable "new_relic_region" {
  description = "New Relic account region."
  type        = string
  default     = "US"

  validation {
    condition     = contains(["US", "EU"], var.new_relic_region)
    error_message = "new_relic_region must be US or EU."
  }
}

variable "external_error_ratio_critical" {
  description = "Critical alert threshold for external provider error ratio."
  type        = number
  default     = 25
}

variable "stale_channel_critical" {
  description = "Critical alert threshold for stale realtime channels."
  type        = number
  default     = 0
}

variable "log_error_rate_critical" {
  description = "Critical alert threshold for data-service error logs per 5 minutes."
  type        = number
  default     = 3
}
