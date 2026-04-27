variable "project" { type = string }
variable "vpc_id" { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "private_subnet_ids" { type = list(string) }
variable "public_alb_sg_id" { type = string }
variable "internal_alb_sg_id" { type = string }
