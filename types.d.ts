declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import { Component } from 'react';
  import { TextProps } from 'react-native';

  export interface MaterialCommunityIconsProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  export default class MaterialCommunityIcons extends Component<MaterialCommunityIconsProps> {}
}
