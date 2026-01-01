import { Card, Empty, Flex, Space, Typography } from 'antd';
import { useEditorStore } from '../store/useEditorStore';


import { GrTemplate } from "react-icons/gr";
import { PiTextAaLight } from "react-icons/pi";
import { MdOutlinePhotoSizeSelectActual } from "react-icons/md";
import { IoShapesOutline } from "react-icons/io5";
import { GrCloudUpload } from "react-icons/gr";
import { SlLayers } from "react-icons/sl";
import { PiResizeThin } from "react-icons/pi";
import { MdOutlineShapeLine } from "react-icons/md";

import Texxt from './Texxt';
import Photo from './Photo';
import Element from './Element';
import Upload from './Upload';
import Generate from './Generate';

import Resize from './Resize';
import Banner from './Banner';
import EditingPopup from './EditingPopup';
import Layer from './Layer';
import Shape from './Shape';
import TescoLogo from './TescoLogo';
import TescoTag from './TescoTag';



const getIcon = (type) => {
    switch (type) {
        case "banner":
            return <GrTemplate style={{ fontSize: 20 }} />;
        case "text":
            return <PiTextAaLight style={{ fontSize: 20 }} />;
        case "photo":
            return <MdOutlinePhotoSizeSelectActual style={{ fontSize: 20 }} />;
        case "image":
            return <MdOutlinePhotoSizeSelectActual style={{ fontSize: 20 }} />;
        case "element":
            return <IoShapesOutline style={{ fontSize: 20 }} />;
        case "upload":
            return <GrCloudUpload style={{ fontSize: 20 }} />;
        case "layer":
            return <SlLayers style={{ fontSize: 20 }} />;
        case "resize":
            return <PiResizeThin style={{ fontSize: 20 }} />;
        case "rect":
            return <MdOutlineShapeLine style={{ fontSize: 20 }} />;
        default:
            return null;
    }
};


const Sidebar = ({ selectedEl, setElement, activePage, setPagesWithHistory, openMiniFor, stageRef }) => {
    const path = useEditorStore((state) => state.path) || "";
    
    // Normalize path - remove leading slash if present
    const normalizedPath = path?.startsWith?.("/") ? path.slice(1) : path;


    return (
        <>
            <Card title={
                <>
                    <Flex align='center' justify='start' gap={5} style={{ 
                        textTransform: "capitalize",
                        color: "#1a1a1a",
                        fontWeight: 600
                    }}>
                        <span style={{ color: "#FF6B35", display: "flex", alignItems: "center" }}>
                            {getIcon(normalizedPath || selectedEl?.type)}
                        </span>
                        {normalizedPath || selectedEl?.type || "sidebar"}
                    </Flex>
                </>
            }
                size="small"
                style={{ 
                    border: 'none', 
                    borderRadius: 0
                }}
                headStyle={{
                    background: "#fafafa",
                    borderBottom: "1px solid #f0f0f0",
                    color: "#1a1a1a"
                }}
            >
                <>
                    {normalizedPath !== undefined ? (
                        <>
                            {normalizedPath === "banner" && <Banner setPagesWithHistory={setPagesWithHistory} />}

                            {normalizedPath === "text" && <Texxt
                                setPagesWithHistory={setPagesWithHistory}
                                openMiniFor={openMiniFor} />}


                            {normalizedPath === "photo" && <Photo setPagesWithHistory={setPagesWithHistory} />}

                            {normalizedPath === "element" && <Element setPagesWithHistory={setPagesWithHistory} />}

                            {normalizedPath === "shape" && <Shape
                                setPagesWithHistory={setPagesWithHistory}
                            />}



                            {normalizedPath === "upload" && (
                              <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                                <TescoLogo setPagesWithHistory={setPagesWithHistory} />
                                <TescoTag setPagesWithHistory={setPagesWithHistory} />
                                <Upload setPagesWithHistory={setPagesWithHistory} />
                              </div>
                            )}

                            {normalizedPath === "generate" && <Generate setPagesWithHistory={setPagesWithHistory} />}


                            {normalizedPath === "resize" && <Resize stageRef={stageRef} />}

                            {normalizedPath === "layer" && <Layer
                                elements={activePage?.children || []}
                                onToggleLock={(id) => {
                                    setElement(id, (el) => ({ ...el, locked: !el?.locked }));
                                    // dispatch(setPath('layer'));
                                }}
                                onToggleVisibility={(id) => {
                                    setElement(id, (el) => ({ ...el, visible: !el?.visible }));
                                    // dispatch(setPath('layer'));

                                }}
                                onReorder={(newChildren) => {
                                    setPagesWithHistory((pages) =>
                                        pages?.map((p) =>
                                            p?.id === activePage?.id ? { ...p, children: newChildren } : p
                                        )
                                    );
                                }}
                            />
                            }
                        </>
                    ) : (
                        <>  <EditingPopup
                            selectedEl={selectedEl}
                            setElement={setElement}
                            setPagesWithHistory={setPagesWithHistory}
                            openMiniFor={openMiniFor}
                            activePage={activePage} />
                        </>
                    )}
                </>

            </Card>
        </>
    )
}

export default Sidebar;