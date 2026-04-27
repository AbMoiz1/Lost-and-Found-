# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — VPC Module
# ─────────────────────────────────────────────────────────────────────────────
# LOCAL EQUIVALENT: The "backend" Docker bridge network in docker-compose.
# Locally, all 15 containers share one flat network — any container can talk
# to any other container on any port. No firewalls, no isolation.
#
# The VPC replaces this with:
#   - Public subnets (ALB + NAT Gateways only — internet accessible)
#   - Private subnets (all services, databases — hidden from internet)
#   - Route tables controlling traffic flow
#   - One Internet Gateway (the door to the internet)
#   - NAT Gateways (let private resources reach internet without being exposed)
#
# SA EXAM NOTE: VPC is the foundation of AWS networking. Key concepts:
#   - /16 CIDR = 65,536 IPs. AWS reserves 5 per subnet.
#   - Public subnet = route to IGW. Private subnet = route to NAT.
#   - 3 AZs = high availability. If one AZ dies, two keep running.
#   - NAT Gateway per AZ = HA for outbound internet from private subnets.
# ─────────────────────────────────────────────────────────────────────────────

# Fetch available AZs in the region
data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 3)

  public_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_cidrs = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

# ── VPC ──────────────────────────────────────────────────────────────────────
# SA EXAM NOTE: enable_dns_hostnames lets resources in the VPC get public DNS
# names. Required for RDS endpoints and other AWS services to resolve properly.
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.project}-vpc"
  }
}

# ── INTERNET GATEWAY ─────────────────────────────────────────────────────────
# SA EXAM NOTE: The IGW is the door between your VPC and the internet.
# Without it, nothing in the VPC can reach the internet (and vice versa).
# Only ONE IGW per VPC. It's horizontally scaled and HA by default.
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project}-igw"
  }
}

# ── PUBLIC SUBNETS (3x, one per AZ) ─────────────────────────────────────────
# These hold ONLY the Public ALB and NAT Gateways.
# map_public_ip_on_launch = true means resources here get public IPs.
resource "aws_subnet" "public" {
  count = 3

  vpc_id                  = aws_vpc.main.id
  cidr_block              = local.public_cidrs[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project}-public-${local.azs[count.index]}"
    Tier = "public"
  }
}

# ── PRIVATE SUBNETS (3x, one per AZ) ────────────────────────────────────────
# These hold ALL compute and data resources: ECS services, RDS, Redis,
# OpenSearch, Internal ALB. No public IPs, no direct internet access.
resource "aws_subnet" "private" {
  count = 3

  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_cidrs[count.index]
  availability_zone = local.azs[count.index]

  tags = {
    Name = "${var.project}-private-${local.azs[count.index]}"
    Tier = "private"
  }
}

# ── ELASTIC IPs for NAT Gateways (3x) ───────────────────────────────────────
# Each NAT Gateway needs a static public IP (Elastic IP).
# SA EXAM NOTE: EIPs are free when attached to a running resource.
# You get charged if the EIP is allocated but NOT attached.
resource "aws_eip" "nat" {
  count  = 3
  domain = "vpc"

  tags = {
    Name = "${var.project}-nat-eip-${local.azs[count.index]}"
  }

  depends_on = [aws_internet_gateway.main]
}

# ── NAT GATEWAYS (3x, one per AZ) ───────────────────────────────────────────
# SA EXAM NOTE: NAT Gateway allows private subnet resources to reach the
# internet (pull Docker images from ECR, call SES, etc.) WITHOUT being
# reachable FROM the internet. It's one-way: outbound only.
#
# Why one per AZ? If AZ-1's NAT fails, AZ-2 and AZ-3 still have internet.
# Using a single NAT = single point of failure. Exam answer: one per AZ.
resource "aws_nat_gateway" "main" {
  count = 3

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "${var.project}-nat-${local.azs[count.index]}"
  }

  depends_on = [aws_internet_gateway.main]
}

# ── PUBLIC ROUTE TABLE ───────────────────────────────────────────────────────
# One route table shared by all public subnets.
# Route: 0.0.0.0/0 → Internet Gateway (all internet traffic goes through IGW)
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.project}-public-rt"
  }
}

# Associate public subnets with the public route table
resource "aws_route_table_association" "public" {
  count = 3

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# ── PRIVATE ROUTE TABLES (3x, one per AZ) ───────────────────────────────────
# Each private subnet gets its own route table pointing to the NAT Gateway
# in the SAME AZ. This ensures AZ-independent routing.
#
# SA EXAM NOTE: Why separate route tables per AZ?
# If all private subnets shared one route table pointing to NAT in AZ-1,
# and AZ-1 dies, ALL private subnets lose internet. With per-AZ route tables,
# each subnet uses its own AZ's NAT — failure is isolated.
resource "aws_route_table" "private" {
  count = 3

  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "${var.project}-private-rt-${local.azs[count.index]}"
  }
}

# Associate private subnets with their per-AZ route tables
resource "aws_route_table_association" "private" {
  count = 3

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
