import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Chip, 
  Stack,
  Divider,
  Paper,
  Tabs,
  Tab,
  Avatar,
  Tooltip
} from "@mui/material";
import { 
  Event as EventIcon,
  WbSunny,
  Cloud,
  Terrain,
  Star,
  AccessTime,
  Info
} from "@mui/icons-material";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useGameData } from "../hooks/useGameData";

interface GameEvent {
  id: string;
  name: string;
  type: "clima" | "season" | "mapa" | "event";
  description: string;
  icon: string;
  banner?: string;
  period: {
    start?: string;
    end?: string;
  };
}

const typeMap = {
  clima: { label: "Clima", icon: <Cloud />, color: "#4fc3f7" },
  season: { label: "Temporada", icon: <WbSunny />, color: "#ffb74d" },
  mapa: { label: "Mapa", icon: <Terrain />, color: "#81c784" },
  event: { label: "Evento", icon: <Star />, color: "#ba68c8" }
};

export function EventsPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { data: events, loading } = useGameData<GameEvent[]>(gameId, "events");
  const [tabValue, setTabValue] = useState(0);

  if (loading) return null;

  const filteredEvents = events?.filter(event => {
    if (tabValue === 0) return true;
    const types = ["all", "clima", "season", "mapa", "event"];
    return event.type === (types[tabValue] as any);
  }) || [];

  return (
    <Stack sx={{ 
      py: 4, 
      flex: 1,
      background: 'radial-gradient(circle at 50% 0%, rgba(255, 68, 0, 0.05) 0%, transparent 50%)'
    }}>
      <Container maxWidth="xl">
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
          <Avatar sx={{ bgcolor: 'secondary.main', width: 56, height: 56 }}>
            <EventIcon sx={{ fontSize: '2rem' }} />
          </Avatar>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900, color: 'white', letterSpacing: -1 }}>
              Eventos
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Central de eventos climaticos, temporadas e atividades especiais de Heartopia.
            </Typography>
          </Box>
        </Stack>

        <Paper sx={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.02)', 
          backdropFilter: 'blur(10px)',
          borderRadius: 3,
          mb: 4,
          border: '1px solid rgba(255, 255, 255, 0.05)',
          overflow: 'hidden'
        }}>
          <Tabs 
            value={tabValue} 
            onChange={(_, v) => setTabValue(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px: 2,
              '& .MuiTab-root': { py: 2, minHeight: 64, color: 'text.secondary' },
              '& .Mui-selected': { color: 'secondary.main !important' },
              '& .MuiTabs-indicator': { backgroundColor: 'secondary.main', height: 3, borderRadius: '3px 3px 0 0' }
            }}
          >
            <Tab label="Todos" />
            <Tab label="Clima" />
            <Tab label="Temporadas" />
            <Tab label="Mapa" />
            <Tab label="Eventos" />
          </Tabs>
        </Paper>

        <Grid container spacing={3}>
          {filteredEvents.map((event) => {
            const typeInfo = typeMap[event.type];
            
            return (
              <Grid size={{ xs: 12, md: 6 }} key={event.id}>
                <Card sx={{ 
                  height: '100%',
                  borderRadius: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                    '& .event-banner': {
                      transform: 'scale(1.05)'
                    }
                  }
                }}>
                  {event.banner && (
                    <Box sx={{ height: 160, overflow: 'hidden', position: 'relative' }}>
                      <img 
                        src={event.banner} 
                        className="event-banner"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }} 
                        alt="" 
                      />
                      <Box sx={{ 
                        position: 'absolute', 
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.8))'
                      }} />
                    </Box>
                  )}

                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
                      <Avatar 
                        src={event.icon} 
                        sx={{ 
                          width: 64, 
                          height: 64, 
                          border: '2px solid rgba(255,255,255,0.1)',
                          bgcolor: 'rgba(255,255,255,0.05)',
                          mt: event.banner ? -5 : 0,
                          zIndex: 2,
                          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                        }}
                      />
                      <Box sx={{ pt: event.banner ? 1 : 0 }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: 'white', mb: 0.5 }}>
                          {event.name}
                        </Typography>
                        <Chip 
                          size="small" 
                          icon={typeInfo.icon}
                          label={typeInfo.label}
                          sx={{ 
                            backgroundColor: `${typeInfo.color}20`, 
                            color: typeInfo.color,
                            border: `1px solid ${typeInfo.color}40`,
                            fontWeight: 600,
                            '& .MuiChip-icon': { color: 'inherit' }
                          }}
                        />
                      </Box>
                    </Stack>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: 40, lineHeight: 1.6 }}>
                      {event.description}
                    </Typography>

                    <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.05)' }} />

                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <AccessTime sx={{ color: 'secondary.main', fontSize: '1rem' }} />
                        <Typography variant="caption" sx={{ color: 'white', fontWeight: 700 }}>
                          {event.period.start} {event.period.end ? `— ${event.period.end}` : ''}
                        </Typography>
                      </Stack>
                      
                      <Tooltip title="Mais informações em breve">
                        <Box sx={{ color: 'rgba(255,255,255,0.2)' }}>
                          <Info sx={{ fontSize: '1.2rem' }} />
                        </Box>
                      </Tooltip>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {filteredEvents.length === 0 && (
          <Box sx={{ mt: 8, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Nenhum evento desta categoria encontrado.
            </Typography>
          </Box>
        )}
      </Container>
    </Stack>
  );
}
