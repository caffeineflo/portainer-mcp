export interface PortainerEnvironment {
  Id: number;
  Name: string;
  Type: number;
  URL: string;
  Status: number;
  Snapshots?: Array<{
    DockerVersion: string;
    TotalCPU: number;
    TotalMemory: number;
  }>;
}

export interface DockerContainer {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
  Ports: Array<{
    PrivatePort: number;
    PublicPort?: number;
    Type: string;
  }>;
  Created: number;
}

export interface DockerContainerInspect {
  Id: string;
  Name: string;
  Image: string;
  State: {
    Status: string;
    Running: boolean;
    Paused: boolean;
    Restarting: boolean;
    StartedAt: string;
    FinishedAt: string;
  };
  Config: {
    Image: string;
    Env: string[];
    Cmd: string[];
    Labels: Record<string, string>;
  };
  NetworkSettings: {
    Networks: Record<string, {
      IPAddress: string;
      Gateway: string;
    }>;
  };
  Mounts: Array<{
    Type: string;
    Source: string;
    Destination: string;
  }>;
}

export interface PortainerStack {
  Id: number;
  Name: string;
  Type: number;
  EndpointId: number;
  Status: number;
  CreationDate: number;
  UpdateDate: number;
  Env?: Array<{ name: string; value: string }>;
  GitConfig?: {
    URL: string;
    ReferenceName: string;
    ConfigFilePath: string;
  };
}

export interface PortainerStackFile {
  StackFileContent: string;
}

export interface DockerImage {
  Id: string;
  RepoTags: string[];
  Size: number;
  Created: number;
}

export interface DockerVolume {
  Name: string;
  Driver: string;
  Mountpoint: string;
  CreatedAt: string;
  Labels: Record<string, string>;
}

export interface DockerNetwork {
  Id: string;
  Name: string;
  Driver: string;
  Scope: string;
  IPAM: {
    Config: Array<{
      Subnet?: string;
      Gateway?: string;
    }>;
  };
}

export interface DockerContainerStats {
  read: string;
  cpu_stats: {
    cpu_usage: {
      total_usage: number;
    };
    system_cpu_usage: number;
    online_cpus: number;
  };
  precpu_stats: {
    cpu_usage: {
      total_usage: number;
    };
    system_cpu_usage: number;
  };
  memory_stats: {
    usage: number;
    limit: number;
  };
  networks?: Record<string, {
    rx_bytes: number;
    tx_bytes: number;
  }>;
}

export interface PortainerError {
  message: string;
  details?: string;
}
