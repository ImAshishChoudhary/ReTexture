import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ProLayout } from '@ant-design/pro-components';
import { Image, message } from 'antd';

import { setCollapsed, setPath } from '../redux/editorReducer';

import { RxText } from "react-icons/rx";
import { BsWindowSidebar } from "react-icons/bs";
import { HiOutlinePhoto } from "react-icons/hi2";
import { PiShapesThin } from "react-icons/pi";
import { IoCloudUploadOutline, IoShapesOutline } from "react-icons/io5";
import { SlSizeFullscreen, SlLayers } from "react-icons/sl";
import { FaRegUser } from "react-icons/fa";
import { RiMenu2Line, RiMenu3Fill } from "react-icons/ri";


import NetworkStatus from '../components/NetworkStatus';
import Editor from './Editor';


const routes = [
  {
    path: 'banner',
    name: 'banner',
    icon: <BsWindowSidebar size={20} />,
  },
  {
    path: 'text',
    name: 'Text',
    icon: <RxText size={20} />,
  },
  {
    path: 'photo',
    name: 'Photo',
    icon: <HiOutlinePhoto size={22} />,
  },
  {
    path: 'shape',
    name: 'Shape',
    icon: <IoShapesOutline size={20} />,
  },
  {
    path: 'element',
    name: 'Element',
    icon: <PiShapesThin size={21} />,
  },
  {
    path: 'upload',
    name: 'Upload',
    icon: <IoCloudUploadOutline size={22} />,
  },
  {
    path: 'layer',
    name: 'Layer',
    icon: <SlLayers size={19} />,
  },
  {
    path: 'resize',
    name: 'Resize',
    icon: <SlSizeFullscreen size={17} />,
  },
];


export default () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { path, collapsed } = useSelector((state) => state?.editor ?? {});
  const [messageApi, contextHolder] = message.useMessage();

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1000);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 1000)
    };

    window.addEventListener("resize", handleResize);
    return () => removeEventListener("resize", handleResize);
  }, []);

  function handleMenuClick(path) {
    dispatch(setCollapsed({ parent: true, child: false }));
    dispatch(setPath(path));
  }


  function handleMenuBar() {
    dispatch(setCollapsed({ parent: !collapsed.parent, child: true }));
    dispatch(setPath("menubar"));
  };


  const props = {
    route: {
      routes
    },
    location: {
      pathname: `/${path}`,
    },
    collapsed: collapsed?.parent,
    fixSiderbar: true,
    collapsedButtonRender: false,
    menuItemRender: (item, dom) => (
      <div onClick={() => handleMenuClick(item?.name?.toLowerCase())}>
        {dom}
      </div>
    ),
    logo: <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => navigate("/")}>
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#FF6B35"/>
        <path d="M12 12H18V28H12V12Z" fill="white"/>
        <path d="M22 12H28V20H22V12Z" fill="white"/>
        <circle cx="25" cy="25" r="3" fill="white"/>
      </svg>
      <span style={{ fontWeight: "700", fontSize: "20px", color: "#1a1a1a", fontFamily: "'Space Grotesk', sans-serif" }}>TxCo</span>
    </div>,
    title: '',
    avatarProps: {
      icon: <FaRegUser />,
      title: '',
      style: {
        background: '#FFF4F0',
        color: '#FF6B35',
      }
    },
    token: {
      header: {
        colorBgHeader: '#ffffff',
        colorHeaderTitle: '#1a1a1a',
        colorTextMenu: '#1a1a1a',
        colorTextMenuSelected: '#FF6B35',
        colorBgMenuItemSelected: '#FFF4F0',
      },
      sider: {
        colorMenuBackground: '#ffffff',
        colorTextMenu: '#1a1a1a',
        colorTextMenuSelected: '#FF6B35',
        colorBgMenuItemSelected: '#FFF4F0',
        colorTextMenuActive: '#FF6B35',
      },
    }
  };



  return (
    <>
      <ProLayout
        {...props}
        layout={isMobile ? 'top' : "mix"}
        onCollapse={(val) => dispatch(setCollapsed({ parent: val, child: true }))}
        postMenuData={(menuData) => {
          return [
            {
              icon: collapsed?.parent ? <RiMenu3Fill /> : <RiMenu2Line />,
              name: '',
              onTitleClick: handleMenuBar,
            },
            ...(menuData || []),
          ];
        }}
        headerRender={true}
      >
        {contextHolder}
        <NetworkStatus messageApi={messageApi} />
        <Editor />
      </ProLayout>
    </>
  )
};