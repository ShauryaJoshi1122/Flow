import { accountPool } from './accountPool.js';
import { ServerId, VideoProject, ExportResolution } from '../types.js';

export class SessionManager {
  private sampleProjects: VideoProject[] = [
    {
      id: 'proj-s1-001',
      title: 'Neon Cyberpunk Metropolis Flight',
      prompt: 'Cinematic drone shot flying between towering holograms and rain-slicked glass skyscrapers at night, hyperrealistic reflections',
      serverId: 'server-1',
      modelTier: 'veo-3.1-quality',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      durationSeconds: 5,
      exportUrls: {
        '270p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4#t=0,5',
        '720p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4#t=0,5',
        '1080p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4#t=0,5'
      },
      thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'proj-s1-002',
      title: 'Macro Water Drop Prism Splash',
      prompt: 'Ultra slow-motion high-speed camera capture of a pure water droplet colliding with liquid surface, rainbow refraction',
      serverId: 'server-1',
      modelTier: 'veo-3.1-fast',
      createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      durationSeconds: 4,
      exportUrls: {
        '270p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4#t=0,4',
        '720p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4#t=0,4',
        '1080p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4#t=0,4'
      },
      thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'proj-s2-001',
      title: 'Volcanic Island Sunset Time-lapse',
      prompt: 'Dramatic golden hour time-lapse over misty volcanic caldera with cascading clouds and orange magma glow',
      serverId: 'server-2',
      modelTier: 'veo-3.1-quality',
      createdAt: new Date(Date.now() - 3600000 * 14).toISOString(),
      durationSeconds: 6,
      exportUrls: {
        '270p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4#t=10,16',
        '720p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4#t=10,16',
        '1080p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4#t=10,16'
      },
      thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'proj-s3-001',
      title: 'Cosmic Nebula Genesis',
      prompt: 'Deep space telescope zoom into swirling stardust, glowing ionized gas, birth of a solar system',
      serverId: 'server-3',
      modelTier: 'veo-3.1-lite',
      createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
      durationSeconds: 5,
      exportUrls: {
        '270p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4#t=20,25',
        '720p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4#t=20,25',
        '1080p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4#t=20,25'
      },
      thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80'
    }
  ];

  public getSessionPayloadForExtension() {
    const activeServer = accountPool.getActiveServer();
    const rawServer = accountPool.getRawServer(activeServer.id);

    return {
      serverId: activeServer.id,
      serverName: activeServer.name,
      targetUrl: 'https://labs.google/fx/tools/flow',
      cookies: rawServer ? rawServer.cookies : [],
      injectionTimestamp: new Date().toISOString()
    };
  }

  public getProjectsForServer(serverId: ServerId): VideoProject[] {
    return this.sampleProjects.filter(p => p.serverId === serverId);
  }

  public getAllProjects(): VideoProject[] {
    return this.sampleProjects;
  }

  public addProject(project: Omit<VideoProject, 'id' | 'createdAt'>): VideoProject {
    const newProj: VideoProject = {
      ...project,
      id: `proj-${project.serverId}-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString()
    };
    this.sampleProjects.unshift(newProj);
    return newProj;
  }
}

export const sessionManager = new SessionManager();
