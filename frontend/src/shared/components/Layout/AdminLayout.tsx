import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Select,
  FormControl,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  ExitToApp as ExitToAppIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../../lib/stores/authStore';
import { api } from '../../../lib/api';

const drawerWidth = 240;

const adminMenuItems = [
  { text: 'Dashboard Admin', icon: <DashboardIcon />, path: '/admin' },
  {
    text: 'Organizações',
    icon: <BusinessIcon />,
    path: '/admin/organizations',
  },
  { text: 'Usuários', icon: <PeopleIcon />, path: '/admin/users' },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, setAuth } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [switchingOrg, setSwitchingOrg] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      logout();
      navigate('/login');
    }
  };

  const handleBackToApp = () => {
    if (user?.currentOrganization) {
      navigate('/dashboard');
    } else {
      navigate('/select-organization');
    }
  };

  const handleOrganizationChange = async (organizationId: string) => {
    setSwitchingOrg(true);
    try {
      const response = await api.post('/auth/select-organization', {
        organizationId,
      });
      const { user, accessToken } = response.data;
      setAuth(user, accessToken);
      // Stay on admin panel after switching
    } catch (error) {
      console.error('Erro ao trocar organização:', error);
    } finally {
      setSwitchingOrg(false);
    }
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          PayTrack Admin
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {adminMenuItems.map(item => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleBackToApp}>
            <ListItemIcon>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText primary="Voltar ao App" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'error.main',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Painel Administrativo
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {user?.availableOrganizations &&
              user.availableOrganizations.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <Select
                    value={user.currentOrganization?.id || ''}
                    onChange={e => handleOrganizationChange(e.target.value)}
                    disabled={switchingOrg}
                    sx={{
                      bgcolor: 'error.dark',
                      color: 'white',
                      '& .MuiSelect-icon': { color: 'white' },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                    }}
                    displayEmpty
                    renderValue={selected => {
                      if (!selected) {
                        return <em>Selecione uma organização</em>;
                      }
                      const org = user.availableOrganizations.find(
                        o => o.id === selected
                      );
                      return (
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <BusinessIcon fontSize="small" />
                          <Typography variant="body2">{org?.name}</Typography>
                        </Box>
                      );
                    }}
                  >
                    {user.availableOrganizations.map(org => (
                      <MenuItem key={org.id} value={org.id}>
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <BusinessIcon fontSize="small" />
                          <Typography>{org.name}</Typography>
                          <Chip
                            label={org.role}
                            size="small"
                            color="primary"
                            sx={{ ml: 1 }}
                          />
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            <Typography variant="body2">{user?.name}</Typography>
            <IconButton onClick={handleMenuOpen} size="small">
              <Avatar
                sx={{ width: 32, height: 32, bgcolor: 'error.dark' }}
                alt={user?.name}
              >
                {user?.name.charAt(0)}
              </Avatar>
            </IconButton>
          </Box>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleLogout}>
              <ExitToAppIcon sx={{ mr: 1 }} />
              Sair
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
