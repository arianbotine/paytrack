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
  Tooltip,
  useMediaQuery,
  useTheme,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Receipt as ReceivablesIcon,
  Payment as PayablesIcon,
  AccountBalance as PaymentsIcon,
  People as CustomersIcon,
  Business as VendorsIcon,
  Category as CategoriesIcon,
  LocalOffer as TagsIcon,
  Person as UsersIcon,
  Logout as LogoutIcon,
  ChevronLeft as ChevronLeftIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  AdminPanelSettings as AdminIcon,
  Business as BusinessIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useAuthStore } from '@/lib/stores/authStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { api } from '@/lib/api';
import { OrganizationSwitcher } from '../OrganizationSwitcher';

const drawerWidth = 260;
const miniWidth = 64;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Contas a Pagar', icon: <PayablesIcon />, path: '/payables' },
  { text: 'Contas a Receber', icon: <ReceivablesIcon />, path: '/receivables' },
  { text: 'Pagamentos', icon: <PaymentsIcon />, path: '/payments' },
  { divider: true, key: 'divider-1' },
  { text: 'Clientes', icon: <CustomersIcon />, path: '/customers' },
  { text: 'Credores', icon: <VendorsIcon />, path: '/vendors' },
  { text: 'Categorias', icon: <CategoriesIcon />, path: '/categories' },
  { text: 'Tags', icon: <TagsIcon />, path: '/tags' },
  { divider: true, key: 'divider-2' },
  {
    text: 'Usuários',
    icon: <UsersIcon />,
    path: '/users',
    roles: ['OWNER', 'ADMIN'],
  },
];

export function MainLayout() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  const { user, logout } = useAuthStore();
  const {
    sidebarOpen,
    toggleSidebar,
    setSidebarOpen,
    themeMode,
    toggleThemeMode,
  } = useUIStore();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);

  const handleProfileMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      logout();
      navigate('/login');
    }
  };

  const handleAdminPanel = () => {
    handleCloseMenu();
    navigate('/admin');
  };

  const handleChangePassword = () => {
    handleCloseMenu();
    navigate('/change-password');
  };

  const handleOrganizationSwitcher = () => {
    handleCloseMenu();
    setOrgSwitcherOpen(true);
  };

  const handleCloseOrgSwitcher = () => {
    setOrgSwitcherOpen(false);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const filteredMenuItems = menuItems.filter(item => {
    if ('roles' in item && item.roles) {
      return item.roles.includes(user?.currentOrganization?.role || '');
    }
    return true;
  });

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
        }}
      >
        <Typography
          variant="h6"
          noWrap
          component="div"
          color="primary"
          fontWeight="bold"
        >
          PayTrack
        </Typography>
        {!isMobile && !isTablet && (
          <IconButton onClick={toggleSidebar} size="small">
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1, pt: 1 }}>
        {filteredMenuItems.map((item, index) =>
          'divider' in item ? (
            <Divider key={item.key || `divider-${index}`} sx={{ my: 1 }} />
          ) : (
            <ListItem key={item.text} disablePadding sx={{ px: 1 }}>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigation(item.path)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{ display: isTablet ? 'none' : 'block' }}
                />
              </ListItemButton>
            </ListItem>
          )
        )}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          size="small"
          startIcon={<BusinessIcon />}
          onClick={handleOrganizationSwitcher}
          disabled={(user?.availableOrganizations?.length || 0) <= 1}
          sx={{
            justifyContent: 'flex-start',
            textTransform: 'none',
            borderColor: 'divider',
            color: 'text.secondary',
            '&:hover': {
              borderColor: 'primary.main',
              color: 'primary.main',
            },
          }}
        >
          <Typography
            variant="caption"
            noWrap
            sx={{ flex: 1, textAlign: 'left' }}
          >
            {user?.currentOrganization?.name || 'Sem organização'}
          </Typography>
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
          ml: { md: sidebarOpen ? `${drawerWidth}px` : 0 },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
        elevation={0}
        color="inherit"
      >
        <Toolbar
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={toggleSidebar}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title={themeMode === 'dark' ? 'Modo claro' : 'Modo escuro'}>
            <IconButton
              onClick={toggleThemeMode}
              color="inherit"
              sx={{ mr: 1 }}
            >
              {themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Perfil">
            <IconButton onClick={handleProfileMenu} size="small" sx={{ ml: 2 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                {user?.name?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseMenu}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2">{user?.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
            <Divider />
            {(user?.availableOrganizations?.length || 0) > 1 && (
              <>
                <MenuItem onClick={handleOrganizationSwitcher}>
                  <ListItemIcon>
                    <BusinessIcon fontSize="small" />
                  </ListItemIcon>
                  Trocar Organização
                </MenuItem>
                <Divider />
              </>
            )}
            {user?.isSystemAdmin && (
              <>
                <MenuItem onClick={handleAdminPanel}>
                  <ListItemIcon>
                    <AdminIcon fontSize="small" />
                  </ListItemIcon>
                  Painel Admin
                </MenuItem>
                <Divider />
              </>
            )}
            <MenuItem onClick={handleChangePassword}>
              <ListItemIcon>
                <LockIcon fontSize="small" />
              </ListItemIcon>
              Alterar Senha
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Sair
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: {
            tablet: sidebarOpen ? miniWidth : 0,
            md: sidebarOpen ? drawerWidth : 0,
          },
          flexShrink: { tablet: 0, md: 0 },
        }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={isMobile && sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="persistent"
          open={sidebarOpen}
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: 1,
              borderColor: 'divider',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          mt: '64px',
          minHeight: 'calc(100vh - 64px)',
          bgcolor: 'background.default',
        }}
      >
        <Outlet />
      </Box>

      {orgSwitcherOpen && (
        <OrganizationSwitcher onClose={handleCloseOrgSwitcher} />
      )}
    </Box>
  );
}
