import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './screens/HomeScreen.js';
import WorkoutsScreen from './screens/WorkoutsScreen.js';
import ExercisesScreen from './screens/ExerciseScreen.js';
import ProfileScreen from './screens/ProfilesScreen.js';
import SettingsScreen from './screens/SettingScreens.js';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          initialRouteName="Home"
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              if (route.name === 'Home') {
                iconName = focused ? 'home' : 'home-outline';
              } else if (route.name === 'Workouts') {
                iconName = focused ? 'barbell' : 'barbell-outline';
              } else if (route.name === 'Exercises') {
                iconName = focused ? 'list' : 'list-outline';
              } else if (route.name === 'Profile') {
                iconName = focused ? 'person' : 'person-outline';
              } else if (route.name === 'Settings') {
                iconName = focused ? 'settings' : 'settings-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#6366f1',
            tabBarInactiveTintColor: '#9ca3af',
            tabBarStyle: {
              backgroundColor: '#1f2937',
              borderTopColor: '#374151',
              borderTopWidth: 1,
              height: 90,
              paddingBottom: 30,
              paddingTop: 10,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600',
            },
          })}
        >
          <Tab.Screen name="Exercises" component={ExercisesScreen} />
          <Tab.Screen name="Workouts" component={WorkoutsScreen} />
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}